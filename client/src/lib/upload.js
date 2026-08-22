/**
 * Where photographs actually live.
 *
 * The browser shrinks a photo (see image.js) and then posts it straight to
 * Cloudinary using an unsigned upload preset. The server never handles the
 * file, there is no API secret anywhere in this code, and what gets stored on
 * the member or event is just a URL.
 *
 * With no Cloudinary settings configured this falls back to the old behaviour —
 * the compressed image is inlined as a data URI — so the app still runs on a
 * laptop with no account set up. That fallback is fine for trying things out
 * and is NOT fine in production: a data URI cannot be cached by the browser, so
 * every visitor re-downloads every photo on every visit.
 */

import { compressImageFile } from './image.js';

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD || '';
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || '';

export const usingImageHost = Boolean(CLOUD && PRESET);
export const imageHostName = CLOUD;

/**
 * Shrink, upload, and give back the URL to store.
 * `size` and `quality` are passed through to the client-side compression, so a
 * 6 MB phone photo becomes ~100 KB before it ever leaves the device.
 */
export async function uploadImage(file, { folder = 'rsyc', ...compressOptions } = {}) {
  const compressed = await compressImageFile(file, compressOptions);

  if (!usingImageHost) return compressed;

  const form = new FormData();
  // Cloudinary accepts a data URI directly in the file field.
  form.append('file', compressed);
  form.append('upload_preset', PRESET);
  form.append('folder', folder);

  let res;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new Error('Could not reach the image host. Check the connection and try again.');
  }

  if (!res.ok) {
    const detail = await res.text();
    // Nearly always a misconfigured preset, so say so rather than dumping JSON.
    throw new Error(
      res.status === 400
        ? 'The image host refused the upload. Check the upload preset is unsigned.'
        : `Upload failed (${res.status}). ${detail.slice(0, 120)}`,
    );
  }

  const data = await res.json();
  if (!data.secure_url) throw new Error('The image host did not return a URL.');
  return data.secure_url;
}

/**
 * How many real pixels to fetch for each CSS pixel.
 *
 * This used to be left to Cloudinary's dpr_auto, which quietly did nothing.
 * dpr_auto depends on the browser sending a DPR client hint; the page never
 * opted in with an Accept-CH header, and Safari does not implement the hint at
 * all — so every iPhone in the village was being sent a 1x image and stretching
 * it across a 3x screen.
 *
 * Asking for 2x outright is not clever, but it is predictable, and it works in
 * every browser. 2x rather than 3x because the difference between them is very
 * hard to see and the file is more than twice the size.
 */
const PIXEL_RATIO = 2;

/**
 * Ask Cloudinary for the size actually needed at this spot on the page.
 *
 * `width` is in CSS pixels — the width the image occupies in the layout. The
 * screen density is applied here, so callers describe their layout and nothing
 * else.
 *
 *   c_limit      fit inside the box, never crop, and never enlarge past the
 *                original — an upscale on the server just spends bytes to look
 *                the same as letting the browser stretch it
 *   f_auto       WebP or AVIF where the browser supports it
 *   q_auto:good  quality chosen per image, with a floor that keeps faces clean.
 *                Plain q_auto leans harder on compression, and skin and hair
 *                are where that shows first
 *
 * Anything that is not a Cloudinary URL — a data URI, a local /images file —
 * passes straight through untouched.
 */
export function imageUrl(url, { width, height } = {}) {
  if (!url || !width) return url;
  if (!url.includes('/image/upload/')) return url;

  const parts = ['c_limit', `w_${Math.round(width * PIXEL_RATIO)}`];
  if (height) parts.push(`h_${Math.round(height * PIXEL_RATIO)}`);
  parts.push('f_auto', 'q_auto:good');

  return url.replace('/image/upload/', `/image/upload/${parts.join(',')}/`);
}
