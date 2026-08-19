import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { config, isDemo } from './config.js';
import { attachSession } from './middleware/auth.js';
import openRouter from './routes/open.js';
import accessRouter from './routes/access.js';
import authRouter from './routes/auth.js';
import viewRouter from './routes/view.js';
import adminRouter from './routes/admin.js';

const app = express();

// Behind a proxy in production, so req.ip is the real client for rate limiting.
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  }),
);

app.use(attachSession);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: isDemo ? 'demo' : 'mongodb' });
});

app.use('/api/open', openRouter);
app.use('/api/access', accessRouter);
app.use('/api/auth', authRouter);
app.use('/api/view', viewRouter);
app.use('/api/admin', adminRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'No such endpoint.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[rsyc]', err);
  res.status(500).json({ error: 'server_error', message: 'Something went wrong on our side.' });
});

app.listen(config.port, () => {
  const line = '='.repeat(62);
  console.log(`\n${line}`);
  console.log('  Rav Shekha Ji Yuva Club, Nangla');
  console.log(`  API listening on http://localhost:${config.port}`);
  if (isDemo) {
    console.log('');
    console.log('  Running on IN-MEMORY DUMMY DATA. Nothing is saved.');
    console.log('  Set MONGODB_URI in server/.env to switch to your cluster.');
    console.log('');
    console.log(`  Club PIN        ${config.demoPin}`);
    console.log(`  Master admin    ${config.masterEmail}  /  ${config.masterPassword}`);
    console.log(`  Admin           ${config.adminEmail}  /  ${config.adminPassword}`);
  } else {
    console.log('  Connected mode: MongoDB');
  }
  console.log(`${line}\n`);
});
