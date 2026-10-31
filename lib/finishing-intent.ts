/** Selected UI areas and preservation instructions are not requests to edit fields. */
export function requestsFieldEdits(recommendation: string) {
  const instruction = recommendation.split('Change these specific areas:')[0].split('Improvement approach:')[0].replace(/\b(?:do not|don't|never)\s+(?:move|rename|relabel|group|reorder|replace)\b[^.!?]*/gi, '');
  return /\b(move|rename|relabel|group|reorder)\b[^.!?]{0,80}\b(fields?|labels?|phone|email|address|zip|contact|family|personal|preferences|education)\b/i.test(instruction)
    || /\b(rename|relabel)\b[^.!?]{0,80}\b(section|heading)\b/i.test(instruction)
    || /\breplace\b[^.!?]{0,80}\b(field|label)\b/i.test(instruction);
}

