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

start();

export default app;
