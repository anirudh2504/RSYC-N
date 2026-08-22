/**
 * Turning a photo from someone's phone into something small enough to store.
 *
 * A picture straight off a phone camera is 3–8 MB. Member cards render it a
 * couple of hundred pixels wide, so almost all of that is waste — waste that
 * costs the village bandwidth every time the directory loads. This scales the
 * whole picture down and re-encodes it as JPEG, turning several megabytes into
 * roughly 40 KB without cropping anything away.
 *
 * The result is a data URI, which upload.js posts on to Cloudinary.
 */

const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export function compressImageFile(file, { size = 512, quality = 0.72 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file chosen.'));
      return;
    }
    if (!file.type || !file.type.startsWith('image/')) {
      reject(new Error('That is not an image. Choose a photo.'));
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      reject(new Error('That photo is very large. Choose one under 15 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be opened.'));

      img.onload = () => {
        try {
          /**
           * Scale the whole photograph down. Do not crop it.
           *
           * This used to centre-crop to a square "because that is the shape of
           * the card". It cost people their heads: a portrait taken on a phone
           * is 3000x4000, a centred square throws away 500 pixels from the top
           * and 500 from the bottom, and a standing person's face is in that
           * top band. Worse, it happened before the upload, so the rest of the
           * picture was gone for good.
           *
           * Nothing needed it, either. The card shows photos with
           * object-fit: contain and Cloudinary is asked for c_fit — both fit
           * the image in without cropping. Keep the whole picture and let the
           * page decide how to present it.
           */
          const scale = Math.min(1, size / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);

          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          reject(new Error('Could not process that image.'));
        }
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

/** Rough byte size of a data URI, for showing the admin what will be stored. */
export function dataUrlBytes(dataUrl) {
  if (!dataUrl) return 0;
  const base64 = String(dataUrl).split(',')[1] || '';
  return Math.round((base64.length * 3) / 4);
}
