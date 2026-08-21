import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET || 'rsyc-dev-secret-change-me',

  // Required. The app has no local storage of its own any more.
  mongoUri: process.env.MONGODB_URI || '',

  viewerSessionDays: 30,
  adminSessionHours: 12,
  entryEditWindowMinutes: 15,

  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  clubName: process.env.CLUB_NAME || 'Rav Shekha Ji Yuva Club, Nangla',

  /**
   * Hostnames photos are allowed to come from. Anything else is refused, so a
   * bad or copied URL cannot point the site at someone else server.
   * Comma separated, e.g. res.cloudinary.com
   */
  imageHosts: (process.env.IMAGE_HOSTS || 'res.cloudinary.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),

  /**
   * Meta WhatsApp Cloud API. Leave empty and the app simply does not send
   * anything — the join form still works and still offers the visitor a
   * wa.me button, which needs none of this.
   */
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || '',
    phoneId: process.env.WHATSAPP_PHONE_ID || '',
    // Comma separated, full international format without +, e.g. 919829011001
    notifyTo: (process.env.WHATSAPP_NOTIFY_TO || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    template: process.env.WHATSAPP_TEMPLATE || '',
    templateLang: process.env.WHATSAPP_TEMPLATE_LANG || 'en',
  },
};

