import { existsSync } from 'node:fs';
import path, { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { config } from './config.js';
import { connect } from './db.js';
import { catchAsync, catchAsyncFn } from './lib/asyncRoutes.js';
import { attachData } from './middleware/data.js';
import { attachSession } from './middleware/auth.js';
import openRouter from './routes/open.js';
import accessRouter from './routes/access.js';
import authRouter from './routes/auth.js';
import viewRouter from './routes/view.js';
import adminRouter from './routes/admin.js';

const app = express();

// Behind a proxy in production, so req.ip is the real client for rate limiting.
app.set('trust proxy', 1);

// Photos travel as URLs now, but a data URI is still accepted as a fallback.
app.use(express.json({ limit: '8mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  }),
);

app.get('/api/health', async (_req, res) => {
  try {
    await connect();
    res.json({ ok: true, database: 'connected' });
  } catch (err) {
    res.status(503).json({ ok: false, database: 'unreachable', message: err.message });
  }
});

/**
 * Order matters: the data gateway has to exist before the session guards can
 * read settings or look an admin up.
 */
app.use('/api', catchAsyncFn(attachData), catchAsyncFn(attachSession));

// catchAsync keeps a failing request from killing the process — see lib/asyncRoutes.js.
app.use('/api/open', catchAsync(openRouter));
app.use('/api/access', catchAsync(accessRouter));
app.use('/api/auth', catchAsync(authRouter));
app.use('/api/view', catchAsync(viewRouter));
app.use('/api/admin', catchAsync(adminRouter));

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'No such endpoint.' });
});

/**
 * Serve the built site.
 *
 * Only used when one process is doing both jobs — a plain host like Render, or
 * `npm start` on your own machine. On a host that serves the built files from
 * its own network (Vercel does) this never runs, and in development Vite serves
 * them instead. If the build is missing it is skipped, so the API still works.
 */
const clientDist = path.resolve(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (existsSync(join(clientDist, 'index.html'))) {
  // Hashed filenames, so they can be cached hard. index.html must not be.
  app.use(express.static(clientDist, { index: false, maxAge: '1y' }));
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'), {
      headers: { 'Cache-Control': 'no-cache' },
    });
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[rsyc]', err);
  res.status(500).json({ error: 'server_error', message: 'Something went wrong on our side.' });
});

/**
 * Last resort. Anything that escapes a request — a background promise, a
 * driver event — gets logged instead of stopping the club site.
 */
process.on('unhandledRejection', (err) => {
  console.error('[rsyc] unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('[rsyc] uncaught exception:', err);
});

async function start() {
  const line = '='.repeat(62);
  console.log(`\n${line}`);
  console.log('  Rav Shekha Ji Yuva Club, Nangla');

  try {
    await connect();
    console.log('  MongoDB connected');

  } catch (err) {
    console.log('');
    console.log('  !! MongoDB is NOT connected.');
    console.log(`  !! ${err.message}`);
    console.log('  !! The API will answer 503 until this is fixed.');
  }

  app.listen(config.port, () => {
    console.log(`  API listening on http://localhost:${config.port}`);
    console.log(`${line}\n`);
  });
}

/**
 * Only take a port when this file was run directly.
 *
 * A serverless host imports the app and handles the network itself; calling
 * listen() there either crashes or silently holds a port nothing will use.
 */
const runDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (runDirectly) start();

export default app;
