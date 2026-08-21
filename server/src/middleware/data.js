/**
 * Puts a data gateway on every request.
 *
 * One snapshot is loaded per request and handed to the routes as `req.db`.
 * Everything downstream — services included — reads from that snapshot rather
 * than reaching for a module-level singleton, which is what makes the ledger
 * arithmetic testable and stops it firing a query per month per member.
 */

import { connect } from '../db.js';
import { loadSnapshot, makeStore } from '../store.js';

export async function attachData(req, res, next) {
  try {
    await connect();
    req.db = makeStore(await loadSnapshot());
    return next();
  } catch (err) {
    console.error('[rsyc] database unavailable:', err.message);
    return res.status(503).json({
      error: 'database_unavailable',
      message: 'The club records are not reachable right now. Please try again in a moment.',
    });
  }
}
