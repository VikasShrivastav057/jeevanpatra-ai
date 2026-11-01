/** Mask quoted content while retaining character positions; apostrophes in don't aren't quotes. */
export function maskQuotedInstruction(text: string) {
  return text.replace(/"[^"\n]*"|“[^”\n]*”|‘[^’\n]*’|(?<![\p{L}\p{N}])'[^'\n]*'/gu, match => ' '.repeat(match.length));
}

/** Separate edit and preservation clauses without breaking quoted text or field-name lists. */
export function finishingClauses(text: string): string[] {
  const masked = maskQuotedInstruction(text);
  const directive = '(?:please\\s+)?(?:keep|preserve|retain|maintain|do not|don’t|don\'t|never|without changing|change|use|make|set|move|shift|nudge|rename|relabel|reorder|rearrange|arrange|sort|swap|group|add|remove|hide|replace|rewrite|polish|reduce|increase|enlarge|shrink|restore|put|place|give)\\b';
  const boundaries = new RegExp(`[!?;\\n]+|(?<!\\d)\\.|\\.(?!\\d)|,\\s*(?=${directive})|\\b(?:and|also|then|while|but)\\s+(?=${directive})|\\bbut\\b|\\s+(?=(?:without changing|keeping|preserving|retaining)\\b)`, 'gi');
  const result: string[] = []; let start = 0;
  for (const match of masked.matchAll(boundaries)) {
    const clause = text.slice(start, match.index).trim();
    if (clause) result.push(clause);
    start = match.index + match[0].length;
  }
  const last = text.slice(start).trim(); if (last) result.push(last);
  return result;
}
