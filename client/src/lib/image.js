/**
 * Turning a photo from someone's phone into something small enough to store.
 *
 * A picture straight off a phone camera is 3–8 MB. Member cards render it in a
 * square about 160px wide, so almost all of that is waste — waste that costs
 * the village bandwidth every time the directory loads. This crops to a centred
 * square, scales down, and re-encodes as JPEG, which turns several megabytes
 * into roughly 40 KB.
 *
 * The result is a data URI, stored straight on the member record. That means no
 * upload endpoint, no file storage and no third-party service to sign up for —
 * and it works the same once MongoDB is connected.
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
          // Centre-crop to a square, because that is the shape of the card.
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          const out = Math.min(side, size);

          const canvas = document.createElement('canvas');
          canvas.width = out;
          canvas.height = out;

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);

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
