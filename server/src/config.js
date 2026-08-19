import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET || 'rsyc-dev-secret-change-me',

  // Empty = run on the in-memory dummy store. Set it to switch to MongoDB.
  mongoUri: process.env.MONGODB_URI || '',

  masterEmail: process.env.MASTER_EMAIL || 'anirajput20022@gmial.com',
  masterPassword: process.env.MASTER_PASSWORD || 'Indian@12',

  adminEmail: process.env.ADMIN_EMAIL || 'tryideas2504@gmail.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Indian@12',

  // Starting club PIN. The master admin changes it from /admin/pin.
  demoPin: process.env.DEMO_PIN || 'Anirudh@1234',

  viewerSessionDays: 30,
  adminSessionHours: 12,
  entryEditWindowMinutes: 15,

  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};

export const isDemo = !config.mongoUri;
