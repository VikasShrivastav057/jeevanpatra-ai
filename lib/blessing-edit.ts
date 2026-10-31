/** Apply explicit quoted header replacements without interpreting devotional names as images. */
export function readBlessingEdit(recommendation: string, current: string, original = current): string | undefined {
  const instruction = recommendation.split('Change these specific areas:')[0].split('Improvement approach:')[0];
  const quotes = [...instruction.matchAll(/"([^"]{0,120})"|“([^”]{0,120})”|‘([^’]{0,120})’|'([^']{0,120})'/g)].map(match => ({
    value: match[1] ?? match[2] ?? match[3] ?? match[4] ?? '', start: match.index, end: match.index + match[0].length,
  }));
  const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  for (let index = 0; index < quotes.length - 1; index += 1) {
    const source = quotes[index];
    const target = quotes[index + 1];
    const before = instruction.slice(Math.max(0, source.start - 100), source.start);
    const between = instruction.slice(source.end, target.start);
    if (/\b(replace|change)\b/i.test(before) && /\b(with|to)\b/i.test(between)
      && [current, original].some(value => normalize(value) === normalize(source.value))) return target.value.trim();
  }
  return undefined;
}

