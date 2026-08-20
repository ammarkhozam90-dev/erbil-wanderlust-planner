import type { Area } from 'react-easy-crop';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Draws just the cropped region onto a canvas and exports it as a JPEG
// Blob. Downscales first if the crop is bigger than `maxDimension` on its
// longest side, so a huge original photo doesn't produce an oversized
// upload just because the user zoomed out.
export async function cropToBlob(
  imageSrc: string,
  area: Area,
  maxDimension = 1600,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const scale = Math.min(1, maxDimension / Math.max(area.width, area.height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(area.width * scale));
  canvas.height = Math.max(1, Math.round(area.height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser');

  ctx.drawImage(
    image,
    area.x, area.y, area.width, area.height,
    0, 0, canvas.width, canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not export the cropped image'))),
      'image/jpeg',
      0.9,
    );
  });
}
