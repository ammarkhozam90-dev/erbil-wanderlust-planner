/**
 * Prepare an image in the browser before upload.
 *
 * Files already under the byte and dimension limits are returned unchanged.
 * Larger files are resized and re-encoded until they are at or below the byte target.
 */
export async function compressImage(
  input: File | Blob,
  {
    maxSizeKB = 250,
    maxDimension = 1600,
    minQuality = 0.5,
  }: { maxSizeKB?: number; maxDimension?: number; minQuality?: number } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(input);
  const withinSize = input.size <= maxSizeKB * 1024;
  const withinDimensions = bitmap.width <= maxDimension && bitmap.height <= maxDimension;

  if (withinSize && withinDimensions) {
    bitmap.close();
    return input;
  }

  const scale =
    bitmap.width > maxDimension || bitmap.height > maxDimension
      ? maxDimension / Math.max(bitmap.width, bitmap.height)
      : 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return input;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.9;
  let output = await canvasToBlob(canvas, quality);
  while (output.size > maxSizeKB * 1024 && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.1);
    output = await canvasToBlob(canvas, quality);
  }
  return output;
}

export function extractMerchantMediaPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/storage/v1/object/public/merchant-media/";
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      "image/jpeg",
      quality,
    );
  });
}
