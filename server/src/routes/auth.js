/** Admin and master sign in. Holding the club PIN gets you nowhere near this. */

import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { issueAdminCookie, clearAdminCookie, requireAdmin } from '../middleware/auth.js';
import { nowIso } from '../utils.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limited',
    message: 'Too many sign in attempts. Please wait a few minutes.',
  },
});

/**
 * First run: claiming the club.
 *
 * The club starts with no admin at all, so somebody has to be able to create
 * the first one without being signed in. That is the only way in, and it is
 * shut permanently the moment it succeeds: once a single admin row exists this
 * route refuses everyone, forever, and further admins can only be added by a
 * master admin from inside.
 *
 * The consequence is worth stating plainly — between the database being empty
 * and this being done, whoever reaches the site first becomes the master
 * admin. Do it on your own machine, before anybody else can open the site.
 */
const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many attempts. Please wait.' },
});

router.get('/setup', async (req, res) => {
  res.json({ needed: req.db.admins().length === 0 });
});

router.post('/setup', setupLimiter, async (req, res) => {
  if (req.db.admins().length > 0) {
    return res.status(403).json({
      error: 'setup_done',
      message: 'This club already has an admin. Sign in instead.',
    });
  }

  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const pin = String(req.body.pin || '').trim();

  const bad = (message) => res.status(400).json({ error: 'invalid', message });

  if (name.length < 2) return bad('Enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Enter a valid email address.');
  if (password.length < 8) return bad('Use a password of at least 8 characters.');
  if (pin.length < 6) {
    return bad('The club PIN must be at least 6 characters. Two or three words is better than four digits.');
  }

  let admin;
  try {
    admin = await req.db.addAdmin({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'master',
      isActive: true,
    });
  } catch (err) {
    // The unique index on the master role caught a second founder arriving at
    // the same moment, or this email is already taken.
    if (err && err.code === 11000) {
      return res.status(403).json({
        error: 'setup_done',
        message: 'This club already has an admin. Sign in instead.',
      });
    }
    throw err;
  }

  // The PIN every member of the village will use to see the fund.
  await req.db.updateSettings({
    pinHash: await bcrypt.hash(pin, 10),
    pinVersion: (req.db.settings().pinVersion || 0) + 1,
    pinUpdatedAt: nowIso(),
    pinUpdatedByAdminId: admin.id,
  });

  issueAdminCookie(res, admin);
  await req.db.addAudit({
    actorAdminId: admin.id,
    action: 'auth.setup',
    category: 'sign-in',
    entityType: 'Admin',
    entityId: admin.id,
    summary: `${admin.name} set up the club and became master admin`,
    ip: req.ip,
  });

  return res.json({ admin: { id: admin.id, name: admin.name, role: admin.role } });
});

router.post('/login', loginLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');

  const admin = req.db.findAdminByEmail(email);
  // Same message either way, so the form never confirms which emails exist.
  const fail = () =>
    res.status(401).json({ error: 'bad_login', message: 'Those details did not match.' });

  if (!admin || !admin.isActive) return fail();

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return fail();

  req.db.admins().forEach((a) => {
    if (a.id === admin.id) a.lastLoginAt = nowIso();
  });

  issueAdminCookie(res, admin);
  await req.db.addAudit({
    actorAdminId: admin.id,
    action: 'auth.login',
    category: 'sign-in',
    entityType: 'Admin',
    entityId: admin.id,
    summary: `${admin.name} signed in`,
    ip: req.ip,
  });

  return res.json({ admin: { id: admin.id, name: admin.name, role: admin.role } });
});

router.post('/logout', async (req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAdmin, async (req, res) => {
  res.json({
    admin: {
      id: req.admin.id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
    },
  });
});

export default router;
