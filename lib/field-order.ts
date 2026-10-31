export type OrderableField = { id: string; label: string; section: string; group?: string };
type Mention = { id: string; start: number; end: number };
export type FieldOrderRequest = { order: string[]; evidence: string };
export class FieldOrderError extends Error {}
const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const bucket = (field: OrderableField) => field.group?.trim() ? `group:${field.group.trim()}` : `section:${field.section}`;
export const fieldOrderGroup = bucket;

/** Preserve existing section/group slots while changing the visible row order within each. */
export function canonicalFieldOrder(order: string[], fields: OrderableField[]) {
  const byId = new Map(fields.map(f => [f.id, f]));
  const groups = new Map<string, string[]>();
  for (const id of order) { const key = bucket(byId.get(id)!); groups.set(key, [...(groups.get(key) || []), id]); }
  return fields.map(field => groups.get(bucket(field))!.shift()!);
}

export function fieldMentions(text: string, fields: OrderableField[]): Mention[] {
  const input = normalize(text), matches: Mention[] = [];
  for (const field of fields) {
    const label = normalize(field.label);
    if (!label) continue;
    for (const alias of label === 'date of birth' ? [label, 'dob'] : [label]) {
      const expression = new RegExp(`(?<![\\p{L}\\p{N}])${escape(alias)}(?![\\p{L}\\p{N}])`, 'gu');
      for (const match of input.matchAll(expression)) matches.push({ id: field.id, start: match.index, end: match.index + match[0].length });
    }
  }
  // Prefer complete labels (e.g. Family Values) over a shorter overlapping label (Values).
  matches.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const selected: Mention[] = [];
  for (const match of matches) {
    const overlap = selected.find(m => match.start < m.end && m.start < match.end);
    if (overlap?.start === match.start && overlap.end === match.end && overlap.id !== match.id) throw new FieldOrderError('Two fields have the same label. Rename them uniquely, or specify the section for the fields you want to reorder. Nothing was changed.');
    if (!overlap) selected.push(match);
  }
  return selected.sort((a, b) => a.start - b.start);
}

function scopedFields(text: string, fields: OrderableField[]) {
  const custom = [...new Set(fields.map(f => f.group?.trim()).filter((g): g is string => Boolean(g)))].sort((a, b) => b.length - a.length).find(group => new RegExp(`\\b(?:in|within|under|for|of|reorder|rearrange|arrange|sort|order)\\s+(?:the\\s+)?${escape(group)}\\b`, 'i').test(text));
  if (custom) return fields.filter(f => f.group?.trim() === custom);
  const scope = text.match(/\b(?:in|within|under|for|of|reorder|rearrange|arrange|sort|order)\s+(?:the\s+)?(personal(?: details| fields)?|family(?: details| fields)?|contact(?: details| fields)?|partner preferences|preferences)\b/i)?.[1];
  if (!scope) return fields;
  const section = scope.toLowerCase().startsWith('partner') ? 'preferences' : scope.toLowerCase().split(' ')[0];
  return fields.filter(f => !f.group?.trim() && f.section === section);
}

export function orderMentionedIds(text: string, fields: OrderableField[]): string[] {
  return [...new Set(text.split(/[.!?;\n]/).flatMap(sentence => fieldMentions(sentence, scopedFields(sentence, fields)).map(m => m.id)))];
}

export function alphabeticalFieldIds(text: string, fields: OrderableField[]): string[] {
  return [...new Set(text.split(/[.!?;\n]/).filter(sentence => /\b(?:sort|arrange|reorder)\b[^.!?]*\balphabetical(?:ly)?\b/i.test(sentence)).flatMap(sentence => scopedFields(sentence, fields).map(field => field.id)))];
}

export function requestsFieldOrder(text: string) {
  return /\b(reorder|rearrange|arrange|sort|sequence|swap)\b|\b(?:field|row) order\b|\b(?:order|sequence)\s*:|\b(before|after|above|below)\b|\b(?:move|put|place|shift|list|order)\b[\s\S]*\b(?:first|last|top|bottom|order|sequence)\b/i.test(text);
}

export function hasFieldOrderIntent(text: string, fields: OrderableField[]) {
  if (!requestsFieldOrder(text)) return false;
  const count = orderMentionedIds(text, fields).length;
  return count >= 2 || count === 1 && /\b(first|last|top|bottom)\b/i.test(text)
    || /\b(fields?|rows?)\b/i.test(text) && /\b(reorder|rearrange|arrange|sort|sequence|swap|order|list)\b/i.test(text);
}

/** Resolve common ordering requests without asking the language model to regenerate fields. */
export function readFieldOrderRequest(instruction: string, fields: OrderableField[]): FieldOrderRequest | undefined {
  const sentences = instruction.split(/[.!?;\n]/).map(s => s.trim()).filter(Boolean);
  let order = fields.map(f => f.id), found = false;
  for (const sentence of sentences) {
    if (!requestsFieldOrder(sentence)) {
      if (/\b(?:do not|don't|never|keep|preserve|retain|maintain)\b/i.test(sentence) && !/\b(?:and|also|but)\s+(?:change|move|use|add|remove|rename|reorder)\b/i.test(sentence)) continue;
      return undefined;
    }
    if (/\b(do not|don't|never|without (?:changing|reordering))\b/i.test(sentence) || /\b(?:keep|preserve|retain)\b.*\b(?:order|sequence|positions?)\b/i.test(sentence)) return undefined;
    if (/\b(?:change|rename|relabel|rewrite|add|remove|delete|font|colou?r|photo|artwork|image|border|spacing)\b/i.test(sentence)) return undefined;
    const scoped = scopedFields(sentence, fields);
    const mentions = fieldMentions(sentence, scoped);
    const unique = [...new Set(mentions.map(m => m.id))];
    const norm = normalize(sentence);
    const relation = /\b(before|after|above|below)\b/i.test(sentence);
    const swap = /\bswap\b/i.test(sentence);
    const edge = /\b(move|put|place|shift)\b[\s\S]*\b(first|last|top|bottom)\b/i.test(sentence);
    if (relation || swap) {
      if (unique.length !== 2 || relation && (sentence.match(/\b(before|after|above|below)\b/gi)?.length || 0) !== 1) return undefined;
      const [source, anchor] = unique.map(id => fields.find(f => f.id === id)!);
      if (bucket(source) !== bucket(anchor)) throw new FieldOrderError('These fields are in different sections. Name the destination section if you want a field moved between sections; reordering alone keeps existing sections unchanged.');
      if (swap) { const a = order.indexOf(source.id), b = order.indexOf(anchor.id); [order[a], order[b]] = [order[b], order[a]]; }
      else {
        const pair = unique.map(id => mentions.find(m => m.id === id)!);
        const between = norm.slice(pair[0].end, pair[1].start);
        const direction = between.match(/\b(before|above|after|below)\b/i)?.[1];
        if (!direction) return undefined;
        order = order.filter(id => id !== source.id); const index = order.indexOf(anchor.id) + (['after', 'below'].includes(direction) ? 1 : 0); order.splice(index, 0, source.id);
      }
    } else if (edge) {
      if (unique.length !== 1) return undefined;
      const source = fields.find(f => f.id === unique[0])!;
      const peers = order.filter(id => bucket(fields.find(f => f.id === id)!) === bucket(source));
      const toEnd = /\b(last|bottom)\b/i.test(sentence); const anchor = toEnd ? peers.at(-1)! : peers[0];
      if (anchor !== source.id) { order = order.filter(id => id !== source.id); order.splice(order.indexOf(anchor) + (toEnd ? 1 : 0), 0, source.id); }
    } else if (/\b(alphabetical|alphabetically|a\s*[-–]\s*z)\b/i.test(sentence)) {
      const eligible = scoped.map(f => f.id); const grouped = new Map<string, string[]>();
      for (const f of scoped) grouped.set(bucket(f), [...(grouped.get(bucket(f)) || []), f.id]);
      for (const ids of grouped.values()) ids.sort((a, b) => fields.find(f => f.id === a)!.label.localeCompare(fields.find(f => f.id === b)!.label));
      order = order.map(id => eligible.includes(id) ? grouped.get(bucket(fields.find(f => f.id === id)!))!.shift()! : id);
    } else {
      if (!/\b(?:order|sequence)\s*(?:as|is|to|:)|\b(?:reorder|rearrange|arrange|list)\b[\s\S]*(?::|\bas\b|\bthis order\b)|\b(?:reorder|rearrange|arrange)\b[\s\S]*,/i.test(sentence)) return undefined;
      const marker = sentence.match(/:\s*|\b(?:as|in this order|in the following order|order (?:is|to))\s*/i);
      const listed = marker ? sentence.slice(marker.index! + marker[0].length) : sentence;
      const ids = [...new Set(fieldMentions(listed, scoped).map(m => m.id))];
      if (ids.length < 2 || new Set(ids.map(id => bucket(fields.find(f => f.id === id)!))).size > 1) return undefined;
      const chosenBucket = bucket(fields.find(f => f.id === ids[0])!);
      const peers = order.filter(id => bucket(fields.find(f => f.id === id)!) === chosenBucket);
      const arranged = [...ids, ...peers.filter(id => !ids.includes(id))]; let index = 0;
      order = order.map(id => bucket(fields.find(f => f.id === id)!) === chosenBucket ? arranged[index++] : id);
    }
    found = true;
  }
  return found ? { order: canonicalFieldOrder(order, fields), evidence: instruction } : undefined;
}
