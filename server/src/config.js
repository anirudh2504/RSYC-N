import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

/**
 * The secret that signs every session cookie.
 *
 * There is a fallback so the app runs on a fresh clone without setup, but it
 * is a fixed string that lives in this repository: anyone who has read the
 * code could mint themselves a master admin cookie with it. In development
 * that is a convenience. On a public site it is the whole security of the app
 * gone, silently, with nothing in the logs to show for it — so there, refuse
 * to start instead.
 */
const DEV_SECRET = 'rsyc-dev-secret-change-me';
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not set. Set it in the host\'s environment variables before deploying — ' +
      'without it the club site would sign its sessions with a secret published in the source code. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
  );
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET || DEV_SECRET,

  // Required. The app has no local storage of its own any more.
  mongoUri: process.env.MONGODB_URI || '',

  viewerSessionDays: 30,
  adminSessionHours: 12,
  entryEditWindowMinutes: 15,

  /**
   * Left empty on purpose. The site and the API share a domain, so the browser
   * never makes a cross-origin request and CORS is not involved. Set this only
   * if the API is moved somewhere separate.
   */
  clientOrigin: process.env.CLIENT_ORIGIN || '',

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

