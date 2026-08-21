import { usingImageHost, imageHostName } from '../lib/upload.js';

/**
 * Says out loud where photographs are going.
 *
 * Without this the two modes look identical while uploading — the difference
 * only shows up later as a slow page or a bloated database. Saying it on the
 * screen where photos are chosen means nobody has to open developer tools to
 * find out which one is running.
 */
export default function UploadTarget() {
  if (usingImageHost) {
    return (
      <p className="hint" style={{ color: 'var(--credit)' }}>
        ✓ Photos upload to Cloudinary ({imageHostName}) and are stored as links.
      </p>
    );
  }

  return (
    <div className="notice-box notice-warn" style={{ marginTop: 8 }}>
      <strong>No image host configured.</strong> Photos are being stored inside the database
      instead. That works for trying things out, but every visitor will re-download every photo on
      every visit. Set <code>VITE_CLOUDINARY_CLOUD</code> and <code>VITE_CLOUDINARY_PRESET</code> in{' '}
      <code>client/.env</code>, then restart the dev server.
    </div>
  );
}
