export type ArtworkArea = { x: number; y: number; width: number; height: number };
export type ArtworkReplacement = { src: string; template: string; variant: string };

export function isArtworkFile(value: unknown): value is string {
  return typeof value === 'string' && /^\/api\/photo\/artwork-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(?:png|jpg|webp)$/.test(value);
}
export function artworkSource(template: string, variant = 'template'): string | undefined {
  if (template === 'mahadev-parvati-devotional') return variant === 'mahadev-radha-krishna'
    ? '/templates/mahadev-radha-krishna-frame.png' : variant === 'radha-krishna-replacement'
      ? '/templates/radha-krishna-mountain-frame.jpg' : '/templates/mahadev-parvati-devotional-frame.png';
  return ({ 'radha-krishna-devotional': '/templates/radha-krishna-devotional-frame.png', 'shri-ram-devotional': '/templates/shri-ram-devotional-frame.png', 'pearl-jewel-luxe': '/templates/pearl-jewel-frame.png', 'emerald-gold-registry': '/templates/emerald-gold-frame.png' } as Record<string, string>)[template];
}
export function isArtworkReplacement(value: unknown): value is ArtworkReplacement {
  if (!value || typeof value !== 'object') return false;
  const item = value as ArtworkReplacement;
  return typeof item.src === 'string' && /^\/api\/photo\/generated-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.png$/.test(item.src) && typeof item.template === 'string' && Boolean(artworkSource(item.template, item.variant))
    && ['template', 'mahadev-radha-krishna', 'radha-krishna-replacement'].includes(item.variant);
}
export function matchesArtwork(value: ArtworkReplacement | undefined, template: string, variant = 'template') {
  return value?.template === template && value.variant === variant;
}
export function isArtworkArea(value: unknown): value is ArtworkArea {
  if (!value || typeof value !== 'object') return false;
  const a = value as ArtworkArea;
  return [a.x, a.y, a.width, a.height].every(v => typeof v === 'number' && Number.isFinite(v))
    && a.x >= 1 && a.y >= 1 && a.width >= 5 && a.height >= 5 && a.x + a.width <= 99 && a.y + a.height <= 99;
}
export function defaultArtworkArea(template: string): ArtworkArea {
  return template.endsWith('-devotional') ? { x: 42, y: 1, width: 53, height: 36 } : { x: 5, y: 2, width: 36, height: 18 };
}
// Route image requests to the image editor, never interpret a blessing or portrait edit as artwork.
export function requestsGeneratedArtwork(text: string): boolean {
  const clauses = finishingClauses(text);
  return clauses.some(clause => /\b(replace|swap|change|generate|create|draw|add|insert)\b/i.test(clause)
    && /\b(image|picture|artwork|illustration|photo|painting)\b/i.test(clause)
    && !/\b(profile|portrait|my photo|my picture)\b/i.test(clause)
    && !/\b(?:photo|picture)\s+(?:shape|size|position|crop|frame)\b/i.test(clause)
    && !/\b(?:replace|change|rewrite|add)\s+(?:the\s+)?(?:existing\s+)?(?:text|word|blessing|font)\b/i.test(clause)
    && !/^\s*(?:do not|don't|never|keep|preserve|without)\b/i.test(clause));
}
import { finishingClauses } from './finishing-instruction';

