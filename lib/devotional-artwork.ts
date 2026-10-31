export type DevotionalArtwork = 'template' | 'mahadev-radha-krishna' | 'radha-krishna-replacement';

/** Resolve supported artwork changes independently of the text model's design JSON. */
export function resolveDevotionalArtwork(recommendation: string, template: string, current?: unknown): DevotionalArtwork {
  const previous = current === 'mahadev-radha-krishna' || current === 'radha-krishna-replacement' ? current : 'template';
  if (!template.includes('mahadev-parvati-devotional')) return 'template';
  if (/\b(do not|don't|never)\s+add\s+(?:an?\s+)?radha[\s-]*krishna\b/i.test(recommendation)) return previous;
  if (/\b(remove|hide|without)\s+(?:the\s+)?radha[\s-]*krishna\b/i.test(recommendation)) return 'template';
  if (/\bradha[\s-]*krishna\b/i.test(recommendation) && /\b(replace|instead|swap)\b/i.test(recommendation) && /\b(mahadev|parvati|shiva)\b/i.test(recommendation)) return 'radha-krishna-replacement';
  if (/\bradha[\s-]*krishna\b/i.test(recommendation)) return 'mahadev-radha-krishna';
  return previous;
}

