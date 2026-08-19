/**
 * The PIN gate.
 *
 * This is the most attacked route in the app and it protects a low-entropy
 * secret, so it gets the strictest limiter in the codebase. Every failure is
 * written to the audit log with the IP, and the master admin can see the last
 * thirty days of them.
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { store } from '../store.js';
import { config, isDemo } from '../config.js';
import { issueViewerCookie, clearViewerCookie } from '../middleware/auth.js';

const router = express.Router();

const unlockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limited',
    message: 'Too many attempts. Please wait a few minutes and try again.',
  },
});

router.get('/session', (req, res) => {
  res.json({
    viewer: !!req.viewer,
    admin: req.admin
      ? { id: req.admin.id, name: req.admin.name, role: req.admin.role }
      : null,
    // Shown on the unlock and sign-in screens while running on dummy data, so
    // whoever is testing can get in. It disappears the moment a database is
    // set, and it is the only place these values live on the client.
    demoHint: isDemo
      ? {
          pin: config.demoPin,
          email: config.masterEmail,
          password: config.masterPassword,
          adminEmail: config.adminEmail,
          adminPassword: config.adminPassword,
        }
      : null,
  });
});

router.post('/unlock', unlockLimiter, async (req, res) => {
  const pin = String(req.body.pin || '');
  const settings = store.settings();

  const ok = pin.length > 0 && (await bcrypt.compare(pin, settings.pinHash));

  if (!ok) {
    store.addAudit({
      actorAdminId: null,
      action: 'access.unlock.failed',
      category: 'access',
      entityType: 'Settings',
      summary: 'Failed unlock attempt',
      ip: req.ip,
    });
    // Deliberately says nothing about length or format.
    return res.status(401).json({ error: 'bad_pin', message: 'That PIN did not work.' });
  }

  issueViewerCookie(res);
  return res.json({ ok: true });
});

router.post('/lock', (_req, res) => {
  clearViewerCookie(res);
  res.json({ ok: true });
});

export default router;
