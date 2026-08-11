/**
 * Resizes and compresses an image (File or Blob) entirely in the browser,
 * before it ever gets uploaded — keeps storage usage and page weight down.
 *
 * - Shrinks the longest side down to `maxDimension` if it's bigger.
 * - Re-encodes as JPEG, stepping quality down until the result is under
 *   `maxSizeKB`, or quality bottoms out (avoids garbage-quality images).
 */
export async function compressImage(
  input: File | Blob,
  { maxSizeKB = 250, maxDimension = 1600, minQuality = 0.5 }: { maxSizeKB?: number; maxDimension?: number; minQuality?: number } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(input);

  let { width, height } = bitmap;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);

  let quality = 0.9;
  let blob = await canvasToBlob(canvas, quality);

  // Step quality down until we're under the size target or hit the floor.
  while (blob.size / 1024 > maxSizeKB && quality > minQuality) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }

  return blob;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), 'image/jpeg', quality);
  });
}
