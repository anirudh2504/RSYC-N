/**
 * Session guards.
 *
 * Three tiers, in order of strictness:
 *
 *   requireViewer  a valid viewer cookie whose pinVersion still matches
 *                  settings, OR any signed-in admin
 *   requireAdmin   a valid admin token for an account that is still active
 *   requireMaster  role re-read from the store, never trusted from the token
 */

import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { store } from '../store.js';

export const VIEWER_COOKIE = 'rsyc_view';
export const ADMIN_COOKIE = 'rsyc_admin';

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax',
  // In production this is served over HTTPS and becomes true.
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export function issueViewerCookie(res) {
  const settings = store.settings();
  const days = settings.viewerSessionDays || config.viewerSessionDays;
  const token = jwt.sign({ role: 'viewer', pinVersion: settings.pinVersion }, config.jwtSecret, {
    expiresIn: `${days}d`,
  });
  res.cookie(VIEWER_COOKIE, token, { ...cookieBase, maxAge: days * 24 * 60 * 60 * 1000 });
}

export function clearViewerCookie(res) {
  res.clearCookie(VIEWER_COOKIE, cookieBase);
}

export function issueAdminCookie(res, admin) {
  const token = jwt.sign({ sub: admin.id, role: admin.role }, config.jwtSecret, {
    expiresIn: `${config.adminSessionHours}h`,
  });
  res.cookie(ADMIN_COOKIE, token, {
    ...cookieBase,
    maxAge: config.adminSessionHours * 60 * 60 * 1000,
  });
}

export function clearAdminCookie(res) {
  res.clearCookie(ADMIN_COOKIE, cookieBase);
}

/** Reads both cookies and hangs the result on req. Never rejects. */
export function attachSession(req, _res, next) {
  req.viewer = false;
  req.admin = null;

  const viewerToken = req.cookies ? req.cookies[VIEWER_COOKIE] : null;
  if (viewerToken) {
    try {
      const claims = jwt.verify(viewerToken, config.jwtSecret);
      // The version check is what makes a PIN rotation instant: the cookie is
      // cryptographically valid and still refused.
      if (claims.role === 'viewer' && claims.pinVersion === store.settings().pinVersion) {
        req.viewer = true;
      }
    } catch {
      /* expired or tampered — treated as no session */
    }
  }

  const adminToken = req.cookies ? req.cookies[ADMIN_COOKIE] : null;
  if (adminToken) {
    try {
      const claims = jwt.verify(adminToken, config.jwtSecret);
      const admin = store.findAdmin(claims.sub);
      if (admin && admin.isActive) {
        req.admin = admin;
        req.viewer = true; // admins never have to unlock separately
      }
    } catch {
      /* expired or tampered — treated as no session */
    }
  }

  return next();
}

export function requireViewer(req, res, next) {
  if (req.viewer) return next();
  return res.status(401).json({ error: 'locked', message: 'Enter the club PIN to see this.' });
}

export function requireAdmin(req, res, next) {
  if (req.admin) return next();
  return res.status(401).json({ error: 'unauthorised', message: 'Please sign in.' });
}

export function requireMaster(req, res, next) {
  // Role is read fresh from the store, not taken from the token, so a demoted
  // admin loses access immediately instead of when their token expires.
  const fresh = req.admin ? store.findAdmin(req.admin.id) : null;
  if (fresh && fresh.role === 'master') return next();
  return res
    .status(403)
    .json({ error: 'forbidden', message: 'Only the master admin can do this.' });
}
