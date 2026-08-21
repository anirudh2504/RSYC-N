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
import { config } from '../config.js';
import { issueViewerCookie, clearViewerCookie } from '../middleware/auth.js';

const router = express.Router();

const unlockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  /**
   * Count only the wrong guesses.
   *
   * Half the village shares one mobile network, so many phones arrive from the
   * same IP. Someone posts the PIN in the club WhatsApp group, ten people open
   * the site within a minute, and if correct unlocks were counted the eleventh
   * would be turned away for a quarter of an hour with the right PIN in hand.
   * Someone guessing only ever produces failures, so the protection is intact.
   */
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limited',
    message: 'Too many attempts. Please wait a few minutes and try again.',
  },
});

router.get('/session', async (req, res) => {
  res.json({
    viewer: !!req.viewer,
    admin: req.admin
      ? { id: req.admin.id, name: req.admin.name, role: req.admin.role }
      : null,
    // A club with no admin yet has not been claimed. The app sends whoever
    // opens it to the setup screen instead of a sign-in form nobody can pass.
    setupNeeded: req.db.admins().length === 0,
  });
});

router.post('/unlock', unlockLimiter, async (req, res) => {
  const pin = String(req.body.pin || '');
  const settings = req.db.settings();

  // Before the club PIN has been chosen there is nothing to compare against.
  // Refuse plainly instead of letting bcrypt decide what an empty hash means.
  if (!settings.pinHash) {
    return res.status(409).json({
      error: 'no_pin',
      message: 'The club PIN has not been set yet. Ask an admin to set it.',
    });
  }

  const ok = pin.length > 0 && (await bcrypt.compare(pin, settings.pinHash));

  if (!ok) {
    await req.db.addAudit({
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

  issueViewerCookie(res, req.db);
  return res.json({ ok: true });
});

router.post('/lock', async (req, res) => {
  clearViewerCookie(res);
  res.json({ ok: true });
});

export default router;
