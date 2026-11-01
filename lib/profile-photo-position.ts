import { isPhotoOffset, type PhotoOffset } from './photo-adjustment';
import { finishingClauses, maskQuotedInstruction } from './finishing-instruction';
import { blessingMoveDirections } from './blessing-position';

export type ProfilePhotoSummary = { offset: PhotoOffset; bounds: { x: number; y: number; width: number; height: number } };
export function isProfilePhotoSummary(v: unknown): v is ProfilePhotoSummary {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>, b = s.bounds as Record<string, unknown> | undefined;
  return Object.keys(s).every(k => ['offset', 'bounds'].includes(k)) && isPhotoOffset(s.offset) && Boolean(b) && typeof b === 'object' && !Array.isArray(b) && Object.keys(b!).every(k => ['x', 'y', 'width', 'height'].includes(k)) && ['x', 'y', 'width', 'height'].every(k => typeof b![k] === 'number' && Number.isFinite(b![k])) && Number(b!.x) >= 0 && Number(b!.y) >= 0 && Number(b!.width) > 0 && Number(b!.height) > 0 && Number(b!.x) + Number(b!.width) <= 100.01 && Number(b!.y) + Number(b!.height) <= 100.01;
}

export function referencesProfilePhoto(text: string) {
  const t = maskQuotedInstruction(text);
  return /\b(?:profile (?:photo|picture|pic|portrait)|portrait|my (?:photo|picture|pic))\b/i.test(t) && !/\b(uploaded|attached|additional|extra|divine|devotional|background)\s+(?:image|photo|picture|portrait)\b/i.test(t);
}
export function requestsProfilePhotoMove(text: string) {
  const t = maskQuotedInstruction(text);
  return referencesProfilePhoto(t) && /\b(move|shift|nudge|reposition|position|place)\b/i.test(t) && !/\b(do not|don't|don’t|never|keep|preserve|unchanged)\b/i.test(t);
}

/** Absolute offsets in percentage points of the A4 content area; no file/crop/size changes. */
export function readProfilePhotoMove(text: string, current: PhotoOffset = { x: 0, y: 0 }) {
  let x = current.x, y = current.y, movedX = false, movedY = false;
  for (const clause of finishingClauses(text)) {
    if (!requestsProfilePhotoMove(clause)) continue;
    const t = maskQuotedInstruction(clause), d = blessingMoveDirections(t);
    if (/\b(crop|cropping|zoom|face)\b/i.test(t)) throw new Error('Use Adjust photo crop to change framing inside the photo. Photo movement keeps the crop and face unchanged.');
    if (/[-−]\s*\d+(?:\.\d+)?\s*%/.test(t)) throw new Error('Use a positive percentage and name the direction, such as 1% left. Nothing was changed.');
    if (d.left && d.right || d.up && d.down || !d.left && !d.right && !d.up && !d.down) throw new Error('Specify one direction per axis for the profile photo: left/right and up/down. Nothing was changed.');
    if (/\b(px|pixels?|mm|cm)\b/i.test(t) || /\d/.test(t) && !/\d\s*%/.test(t)) throw new Error('Use a percentage for the profile photo movement, for example 1% right and 1% down. Nothing was changed.');
    const amounts = [...t.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m => Number(m[1]));
    const values = new Map<string, number>();
    const direction = '(right(?:ward(?:s)?)?|left(?:ward(?:s)?)?|down(?:ward(?:s)?)?|up(?:ward(?:s)?)?)';
    const after = new RegExp(`\\b${direction}\\b\\s*(?:by\\s*)?(?:(?:about|approximately|around|roughly)\\s*)?(\\d+(?:\\.\\d+)?)\\s*%`, 'gi');
    const before = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%\\s*(?:to the\\s*)?${direction}\\b`, 'gi');
    for (const m of t.matchAll(after)) values.set(m[1].toLowerCase().replace(/wards?$/, '').replace(/ward$/, ''), Number(m[2]));
    for (const m of t.matchAll(before)) values.set(m[2].toLowerCase().replace(/wards?$/, '').replace(/ward$/, ''), Number(m[1]));
    const amount = (axis: 'x' | 'y') => {
      const word = axis === 'x' ? d.right ? 'right' : 'left' : d.down ? 'down' : 'up';
      const value = values.get(word) ?? (amounts.length <= 1 ? amounts[0] ?? 1 : undefined);
      if (value === undefined || value > 20) throw new Error('Specify a small percentage for each direction. Use Move photo on biodata for larger adjustments. Nothing was changed.');
      return value;
    };
    if (d.left || d.right) { x += amount('x') * (d.right ? 1 : -1); movedX = true; }
    if (d.up || d.down) { y += amount('y') * (d.down ? 1 : -1); movedY = true; }
  }
  return movedX || movedY ? { ...(movedX ? { x: Math.round(x * 1000) / 1000 } : {}), ...(movedY ? { y: Math.round(y * 1000) / 1000 } : {}) } : undefined;
}
