/**
 * Keep one bad request from taking the whole site down.
 *
 * Express 4 does not understand promises. When an `async` route handler
 * rejects, Express never sees it — the rejection reaches Node as an unhandled
 * error and Node kills the process. Every route in this app is async, so a
 * single unexpected error anywhere (a field that is suddenly missing, a
 * dropped database connection mid-request) would stop the club site for
 * everyone until the host noticed and restarted it.
 *
 * This walks a finished router and hands every rejection to `next` instead,
 * which is what a synchronous `throw` would have done. The error handler in
 * index.js then answers 500 and the server stays up.
 *
 * Call it once on each router, after all the routes are registered.
 */
export function catchAsync(router) {
  for (const layer of router.stack) {
    if (layer.route) {
      // A path with handlers on it: wrap each handler in the chain.
      for (const inner of layer.route.stack) inner.handle = wrap(inner.handle);
    } else if (layer.handle && typeof layer.handle.stack === 'object' && layer.handle.stack) {
      // A nested router mounted with use(): recurse into it.
      catchAsync(layer.handle);
    } else if (typeof layer.handle === 'function') {
      // Plain middleware on the router.
      layer.handle = wrap(layer.handle);
    }
  }
  return router;
}

/**
 * Express decides whether a function is error-handling middleware by counting
 * its declared arguments, so the wrapper has to keep the same arity.
 */
function wrap(fn) {
  if (fn.length >= 4) {
    return function wrapped(err, req, res, next) {
      try {
        return Promise.resolve(fn(err, req, res, next)).catch(next);
      } catch (e) {
        return next(e);
      }
    };
  }
  return function wrapped(req, res, next) {
    try {
      return Promise.resolve(fn(req, res, next)).catch(next);
    } catch (e) {
      return next(e);
    }
  };
}

/** The same protection for a single middleware function used with app.use(). */
export const catchAsyncFn = wrap;
