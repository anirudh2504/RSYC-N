/** Admin and master sign in. Holding the club PIN gets you nowhere near this. */

import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { store } from '../store.js';
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

router.post('/login', loginLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');

  const admin = store.findAdminByEmail(email);
  // Same message either way, so the form never confirms which emails exist.
  const fail = () =>
    res.status(401).json({ error: 'bad_login', message: 'Those details did not match.' });

  if (!admin || !admin.isActive) return fail();

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return fail();

  store.admins().forEach((a) => {
    if (a.id === admin.id) a.lastLoginAt = nowIso();
  });

  issueAdminCookie(res, admin);
  store.addAudit({
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

router.post('/logout', (_req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (req, res) => {
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
