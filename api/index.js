/**
 * Entry point for Vercel.
 *
 * vercel.json sends every /api/* request here. Vercel runs this as a
 * serverless function and hands it the request directly, so there is no port
 * to listen on — the Express app just handles it.
 *
 * The __p parameter is how the original path survives the rewrite. A rewrite
 * to a single function can arrive with the path already collapsed to /api, and
 * Express would then match nothing and answer 404 for every route — which is
 * exactly what a catch-all filename did here: it only ever matched one segment,
 * so /api/health worked and /api/access/session was never routed at all.
 * Carrying the path explicitly leaves no room for the host to interpret it.
 *
 * If the host preserves the URL by itself, __p is simply absent and nothing is
 * rewritten. Both cases end up at the same place.
 *
 * Deploying somewhere else? This file is ignored. A plain Node host runs
 * server/src/index.js, which listens on a port and serves the built site too.
 */
import app from '../server/src/index.js';

export default function handler(req, res) {
  const url = new URL(req.url, 'http://rsyc.invalid');
  const original = url.searchParams.get('__p');

  if (original !== null) {
    url.searchParams.delete('__p');
    const query = url.searchParams.toString();
    req.url = `/api/${original}${query ? `?${query}` : ''}`;
  }

  return app(req, res);
}
