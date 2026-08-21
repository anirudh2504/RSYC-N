/**
 * Rate limiting that survives being deployed.
 *
 * express-rate-limit counts in memory by default. That is fine for one
 * long-running server on one machine, and useless anywhere else: on a
 * serverless host every request can land on a fresh instance with an empty
 * counter, so someone guessing the club PIN gets unlimited attempts while the
 * logs show the limiter is "on". The PIN is the only thing standing between a
 * stranger and every member's phone number, so the count has to live somewhere
 * both instances can see. It lives in MongoDB, next to everything else.
 *
 * Old rows are removed by MongoDB itself through a TTL index, so nothing has to
 * sweep them up.
 */

import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const hitSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

// expireAfterSeconds: 0 means "delete once expiresAt is in the past".
hitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateHit = models.RateHit || model('RateHit', hitSchema);

/**
 * A store for express-rate-limit v7.
 *
 * @param {string} prefix distinguishes one limiter from another, so a failed
 *   sign-in does not count against the same budget as a failed PIN attempt.
 */
export function mongoRateStore(prefix) {
  let windowMs = 15 * 60 * 1000;

  return {
    // Each limiter keeps its own namespace of keys.
    prefix: `${prefix}:`,
    localKeys: false,

    init(options) {
      windowMs = options.windowMs;
    },

    async increment(key) {
      const id = `${prefix}:${key}`;
      const now = new Date();
      const fresh = new Date(now.getTime() + windowMs);

      try {
        /**
         * One atomic step, so two requests arriving together cannot both read
         * the same count and both write back the same number.
         *
         * The pipeline restarts the window when the row it found has already
         * expired but MongoDB has not swept it up yet — the TTL monitor only
         * runs about once a minute, so a stale row is normal, not an edge case.
         */
        const doc = await RateHit.findOneAndUpdate(
          { key: id },
          [
            {
              $set: {
                key: id,
                expiresAt: {
                  $cond: [{ $gt: ['$expiresAt', now] }, '$expiresAt', fresh],
                },
                count: {
                  $cond: [
                    { $gt: ['$expiresAt', now] },
                    { $add: [{ $ifNull: ['$count', 0] }, 1] },
                    1,
                  ],
                },
              },
            },
          ],
          { upsert: true, returnDocument: 'after' },
        ).lean();

        return { totalHits: doc.count, resetTime: doc.expiresAt };
      } catch {
        /**
         * If the database is unreachable the limiter lets the request through.
         * Nothing is lost by doing so: every route behind a limiter needs the
         * database anyway, so it is about to fail on its own terms with a clear
         * message rather than a misleading "too many attempts".
         */
        return { totalHits: 1, resetTime: fresh };
      }
    },

    /** Used by skipSuccessfulRequests: a request that succeeded should not count. */
    async decrement(key) {
      try {
        await RateHit.updateOne({ key: `${prefix}:${key}`, count: { $gt: 0 } }, { $inc: { count: -1 } });
      } catch {
        // Losing a decrement is harmless — the window expires shortly anyway.
      }
    },

    async resetKey(key) {
      try {
        await RateHit.deleteOne({ key: `${prefix}:${key}` });
      } catch {
        // As above.
      }
    },
  };
}
