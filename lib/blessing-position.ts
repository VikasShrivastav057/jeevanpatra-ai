export type BlessingAxis = 'x' | 'y';
export const blessingOffsetBounds = { x: { min: -6, max: 6 }, y: { min: -4, max: 8 } };
export function isBlessingOffset(value: unknown, axis: BlessingAxis): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= blessingOffsetBounds[axis].min && value <= blessingOffsetBounds[axis].max;
}
const normalize = (text: string) => text.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
export function referencesBlessing(text: string, blessing: string) {
  return /\b(blessing|invocation|mantra|devotional text|header text)\b/i.test(text)
    || Boolean(blessing.trim()) && normalize(text).includes(normalize(blessing));
}
export function unquotedPositionInstruction(text: string) {
  return text.replace(/"[^"]*"|“[^”]*”|‘[^’]*’|'[^']*'/g, '');
}
export function blessingMoveDirections(text: string) {
  const instruction = unquotedPositionInstruction(text);
  return { right: /\bright(?:ward(?:s)?)?\b/i.test(instruction), left: /\bleft(?:ward(?:s)?)?\b/i.test(instruction), down: /\b(?:down(?:ward(?:s)?)?|lower)\b/i.test(instruction), up: /\b(?:up(?:ward(?:s)?)?|higher|raise)\b/i.test(instruction) };
}

