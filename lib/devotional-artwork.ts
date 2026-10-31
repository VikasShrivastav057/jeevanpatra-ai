export type DevotionalArtwork = 'template' | 'mahadev-radha-krishna' | 'radha-krishna-replacement';

export function requestsDevotionalArtwork(recommendation: string) {
  const instruction = recommendation.split('Change these specific areas:')[0].split('Improvement approach:')[0];
  const unquoted = instruction.replace(/["“‘'][^"”’']*["”’']/g, '');
  const positive = unquoted.replace(/\b(?:do not|don't|never|keep|preserve|maintain)\b[^.!?]*/gi, '');
  const visual = /\b(add|replace|change|swap|remove|hide|insert|include|use)\b[^.!?]{0,100}\b(image|photo|picture|artwork|illustration|portrait|divine couple|deities)\b/i.test(positive);
  const shorthand = /\b(add|remove|hide)\s+(?:a\s+|the\s+)?radha[\s-]*krishna\b|\b(opposite|alongside|beside)\b/i.test(positive);
  return /\bradha[\s-]*krishna\b/i.test(instruction) && (visual || shorthand);
}

/** Resolve supported artwork changes independently of the text model's design JSON. */
export function resolveDevotionalArtwork(recommendation: string, template: string, current?: unknown): DevotionalArtwork {
  const previous = current === 'mahadev-radha-krishna' || current === 'radha-krishna-replacement' ? current : 'template';
  if (!template.includes('mahadev-parvati-devotional')) return 'template';
  if (!requestsDevotionalArtwork(recommendation)) return previous;
  if (/\b(do not|don't|never)\s+add\s+(?:an?\s+)?radha[\s-]*krishna\b/i.test(recommendation)) return previous;
  if (/\b(remove|hide|without)\s+(?:the\s+)?radha[\s-]*krishna\b/i.test(recommendation)) return 'template';
  if (/\bradha[\s-]*krishna\b/i.test(recommendation) && /\b(replace|instead|swap)\b/i.test(recommendation) && /\b(mahadev|parvati|shiva)\b/i.test(recommendation)) return 'radha-krishna-replacement';
  if (/\bradha[\s-]*krishna\b/i.test(recommendation)) return 'mahadev-radha-krishna';
  return previous;
}

