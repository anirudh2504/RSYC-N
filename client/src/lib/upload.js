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
 * Ask Cloudinary for the size actually needed at this spot on the page.
 *
 * A member card is ~160px and an event banner is ~880px; serving one file for
 * both wastes most of it. Inserting transformation parameters into the URL
 * gets a right-sized, modern-format image without storing extra copies:
 *
 *   c_fit   fit inside the box without cropping — matches object-fit: contain
 *   f_auto  WebP or AVIF where the browser supports it
 *   q_auto  quality chosen per image
 *
 * Anything that is not a Cloudinary URL — a data URI, a local /images file —
 * passes straight through untouched.
 */
export function imageUrl(url, { width, height } = {}) {
  if (!url || !width) return url;
  if (!url.includes('/image/upload/')) return url;

  const parts = [`c_fit`, `w_${Math.round(width)}`];
  if (height) parts.push(`h_${Math.round(height)}`);
  parts.push('f_auto', 'q_auto', 'dpr_auto');

  return url.replace('/image/upload/', `/image/upload/${parts.join(',')}/`);
}
