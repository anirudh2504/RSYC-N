/**
 * Entry point for Vercel.
 *
 * Vercel runs each file under /api as a serverless function and hands it the
 * request itself, so there is no port to listen on — the Express app is simply
 * exported and Vercel calls it.
 *
 * The [...path] filename is deliberate: it makes Vercel's own routing match
 * every /api/* path to this function directly, so the request arrives with its
 * original URL intact and Express can route it. Doing the same job with a
 * rewrite in vercel.json is what breaks this — the app would see the rewritten
 * path instead of the one that was asked for.
 *
 * Deploying somewhere else? This file is ignored. A plain Node host runs
 * server/src/index.js, which listens on a port and serves the built site too.
 */
export { default } from '../server/src/index.js';
