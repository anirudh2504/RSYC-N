/**
 * WhatsApp notification for admins.
 *
 * A server cannot simply "send a WhatsApp". The only sanctioned way is Meta's
 * WhatsApp Cloud API, which needs a Meta Business account, a verified business,
 * a sender number, an access token, and — for a message the club sends first,
 * rather than a reply — a message template Meta has approved in advance.
 *
 * So this module is built and wired in, but stays dormant until those
 * credentials exist in server/.env. With no credentials it does nothing at all
 * and simply reports why, which is why the join form also hands the visitor a
 * wa.me button: that route works today, costs nothing, and needs no approval.
 */

import { config } from '../config.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

export function whatsappConfigured() {
  const w = config.whatsapp;
  return Boolean(w.token && w.phoneId && w.notifyTo.length);
}

async function sendOne(to, body, requestName, requestPhone) {
  const w = config.whatsapp;

  // A template is required for business-initiated messages. Plain text only
  // works inside a 24 hour window after the recipient last messaged you.
  const payload = w.template
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: w.template,
          language: { code: w.templateLang },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: requestName },
                { type: 'text', text: requestPhone },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      };

  const res = await fetch(`${GRAPH}/${w.phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${w.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`WhatsApp API ${res.status}: ${detail.slice(0, 300)}`);
  }
  return true;
}

/**
 * Tells the admins a new join request has arrived. Never throws — a failure to
 * notify must not stop the request itself being saved.
 */
export async function notifyJoinRequest({ name, fatherName, phone, message }) {
  if (!whatsappConfigured()) {
    return { sent: false, reason: 'WhatsApp is not configured; see server/.env.example' };
  }

  const body =
    `New join request — ${config.clubName}\n\n` +
    `Name: ${name}\n` +
    (fatherName ? `S/o: ${fatherName}\n` : '') +
    `Phone: ${phone}\n` +
    (message ? `Message: ${message}\n` : '') +
    `\nPlease call them.`;

  const results = await Promise.allSettled(
    config.whatsapp.notifyTo.map((to) => sendOne(to, body, name, phone)),
  );

  const failed = results.filter((r) => r.status === 'rejected');
  failed.forEach((r) => console.error('[rsyc] WhatsApp notify failed:', r.reason.message));

  return {
    sent: failed.length < results.length,
    delivered: results.length - failed.length,
    total: results.length,
  };
}
