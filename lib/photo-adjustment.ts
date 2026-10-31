export type PhotoCrop = { x: number; y: number; zoom: number };
export type PhotoPlacement = { x: number; y: number; width: number };
export type PhotoAdjustment = { crop: PhotoCrop; placement?: PhotoPlacement };
export const defaultPhotoCrop: PhotoCrop = { x: 50, y: 18, zoom: 1 };
export const a4Ratio = 210 / 297;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n * 1000) / 1000;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const record = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

export function isPhotoAdjustment(v: unknown): v is PhotoAdjustment {
  if (!record(v) || Object.keys(v).some(k => !['crop', 'placement'].includes(k)) || !record(v.crop)) return false;
  const c = v.crop;
  if (Object.keys(c).some(k => !['x', 'y', 'zoom'].includes(k)) || !finite(c.x) || !finite(c.y) || !finite(c.zoom) || c.x < 0 || c.x > 100 || c.y < 0 || c.y > 100 || c.zoom < 1 || c.zoom > 3) return false;
  if (v.placement === undefined) return true;
  const p = v.placement;
  return record(p) && !Object.keys(p).some(k => !['x', 'y', 'width'].includes(k)) && finite(p.x) && finite(p.y) && finite(p.width) && p.width >= 10 && p.width <= 45 && p.x >= 0 && p.y >= 0 && p.x + p.width <= 100.001 && p.y + p.width * a4Ratio <= 100.001;
}

export function boundPhotoPlacement(p: PhotoPlacement): PhotoPlacement {
  const width = clamp(finite(p.width) ? p.width : 25, 10, 45);
  return { x: round(clamp(finite(p.x) ? p.x : 0, 0, 100 - width)), y: round(clamp(finite(p.y) ? p.y : 0, 0, 100 - width * a4Ratio)), width: round(width) };
}

export function resizePhoto(p: PhotoPlacement, width: number): PhotoPlacement {
  return boundPhotoPlacement({ x: p.x + (p.width - width) / 2, y: p.y + (p.width - width) * a4Ratio / 2, width });
}

export function dragPhotoCrop(start: PhotoCrop, dx: number, dy: number, width: number, height: number, naturalWidth: number, naturalHeight: number): PhotoCrop {
  if (![width, height, naturalWidth, naturalHeight].every(n => finite(n) && n > 0)) return start;
  const cover = Math.max(width / naturalWidth, height / naturalHeight);
  const overflowX = naturalWidth * cover * start.zoom - width;
  const overflowY = naturalHeight * cover * start.zoom - height;
  return { ...start, x: round(clamp(start.x - (overflowX > .01 ? dx / overflowX * 100 : 0), 0, 100)), y: round(clamp(start.y - (overflowY > .01 ? dy / overflowY * 100 : 0), 0, 100)) };
}

/** Photo-only edits to a finished profile can be saved without rerunning AI. */
export function sameExceptPhotoAdjustment(saved: string, current: string) {
  if (!saved) return false;
  try {
    const previous: unknown = JSON.parse(saved), next: unknown = JSON.parse(current);
    if (!record(previous) || !record(next)) return false;
    const { photoAdjustment: _previousPhoto, ...a } = previous;
    const { photoAdjustment: _nextPhoto, ...b } = next;
    return JSON.stringify(a) === JSON.stringify(b);
  } catch { return false; }
}

