import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import type { ArtworkArea } from './artwork-generation';

export function decodeArtwork(bytes: Uint8Array): PNG {
  const data = Buffer.from(bytes);
  if (data[0] === 137 && data[1] === 80) {
    // Bound dimensions before allocating/decompressing untrusted provider output.
    if (data.length < 24 || data.readUInt32BE(16) * data.readUInt32BE(20) > 8_000_000) throw new Error('The image is too large.');
    return PNG.sync.read(data);
  }
  const decoded = jpeg.decode(data, { useTArray: true, maxResolutionInMP: 8, maxMemoryUsageInMB: 128 });
  return { ...decoded, data: Buffer.from(decoded.data) } as PNG;
}
export function pixelArea(image: Pick<PNG, 'width' | 'height'>, area: ArtworkArea) {
  return { left: Math.floor(image.width * area.x / 100), top: Math.floor(image.height * area.y / 100), right: Math.ceil(image.width * (area.x + area.width) / 100), bottom: Math.ceil(image.height * (area.y + area.height) / 100) };
}
export function artworkMask(source: PNG, area: ArtworkArea): Buffer {
  const mask = new PNG({ width: source.width, height: source.height });
  mask.data.fill(255);
  const { left, top, right, bottom } = pixelArea(source, area);
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) mask.data[(y * source.width + x) * 4 + 3] = 0;
  return PNG.sync.write(mask);
}
// The model's mask is advisory. Composite only the permitted pixels so all other artwork is preserved exactly.
export function compositeArtwork(source: PNG, generated: PNG, area: ArtworkArea): Buffer {
  const output = new PNG({ width: source.width, height: source.height });
  output.data = Buffer.from(source.data);
  const { left, top, right, bottom } = pixelArea(source, area);
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
    const sx = Math.min(generated.width - 1, Math.floor(x * generated.width / source.width));
    const sy = Math.min(generated.height - 1, Math.floor(y * generated.height / source.height));
    const from = (sy * generated.width + sx) * 4, to = (y * source.width + x) * 4;
    const alpha = generated.data[from + 3] / 255;
    for (let c = 0; c < 3; c++) output.data[to + c] = Math.round(generated.data[from + c] * alpha + source.data[to + c] * (1 - alpha));
    output.data[to + 3] = source.data[to + 3];
  }
  return PNG.sync.write(output);
}
