import { isArtworkArea, type ArtworkArea } from './artwork-generation';

/** Place an uploaded picture in a bounded area; all processing happens in the browser. */
export async function createUploadedArtworkPreview(source: string, upload: string, area: ArtworkArea, crop: { x: number; y: number }): Promise<Blob> {
  if (!isArtworkArea(area)) throw new Error('Choose a valid artwork area.');
  const load = async (src: string) => {
    const image = new Image(); image.src = src; await image.decode();
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 8_000_000) throw new Error('Choose an image smaller than 8 megapixels.');
    return image;
  };
  const [background, artwork] = await Promise.all([load(source), load(upload)]);
  const canvas = document.createElement('canvas'); canvas.width = background.naturalWidth; canvas.height = background.naturalHeight;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Your browser could not prepare this image.');
  context.drawImage(background, 0, 0);
  const left = Math.floor(canvas.width * area.x / 100), top = Math.floor(canvas.height * area.y / 100);
  const width = Math.ceil(canvas.width * (area.x + area.width) / 100) - left, height = Math.ceil(canvas.height * (area.y + area.height) / 100) - top;
  const scale = Math.max(width / artwork.naturalWidth, height / artwork.naturalHeight);
  const sw = width / scale, sh = height / scale;
  const sx = (artwork.naturalWidth - sw) * Math.min(100, Math.max(0, crop.x)) / 100;
  const sy = (artwork.naturalHeight - sh) * Math.min(100, Math.max(0, crop.y)) / 100;
  // Transparent uploads show a neutral base instead of revealing the old artwork underneath.
  context.fillStyle = '#fffaf0'; context.fillRect(left, top, width, height);
  context.drawImage(artwork, sx, sy, sw, sh, left, top, width, height);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The preview could not be created.')), 'image/png'));
}
