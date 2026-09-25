import type { CommandPaletteItem, CommandPaletteMatch } from './command-palette.types';

const isBoundary = (text: string, index: number) =>
  index === 0 || /[\s\-_/.:]/.test(text[index - 1] ?? '');

/**
 * VS Code-style fuzzy match: contiguous substrings rank first (earlier and word-start better),
 * then in-order subsequences with bonuses for consecutive and word-start characters.
 */
export function fuzzyMatch(
  query: string,
  text: string,
): { score: number; indices: number[] } | null {
  const q = query.trim().toLowerCase();
  if (!q) return { score: 0, indices: [] };
  const t = text.toLowerCase();

  const at = t.indexOf(q);
  if (at >= 0) {
    const indices = Array.from({ length: q.length }, (_, i) => at + i);
    return { score: 1000 - at + (isBoundary(t, at) ? 200 : 0), indices };
  }

  const indices: number[] = [];
  let score = 0;
  let from = 0;
  for (const char of q) {
    if (char === ' ') continue;
    const index = t.indexOf(char, from);
    if (index < 0) return null;
    score += 1;
    if (indices.length > 0 && index === (indices.at(-1) ?? -2) + 1) score += 5;
    if (isBoundary(t, index)) score += 8;
    indices.push(index);
    from = index + 1;
  }
  return { score, indices };
}

/** Filters and ranks items; keeps groups together, ordered by their best match. */
export function filterCommands(
  items: readonly CommandPaletteItem[],
  query: string,
): CommandPaletteMatch[] {
  const q = query.trim().toLowerCase();
  const matches: CommandPaletteMatch[] = [];
  for (const item of items) {
    const label = fuzzyMatch(q, item.label);
    if (label) {
      matches.push({ item, score: label.score, indices: label.indices });
      continue;
    }
    const haystack = [item.detail ?? '', ...(item.keywords ?? [])].join(' ').toLowerCase();
    if (q && haystack.includes(q)) matches.push({ item, score: 1, indices: [] });
  }
  if (!q) return matches;

  const groups = new Map<string | undefined, CommandPaletteMatch[]>();
  for (const match of [...matches].sort((a, b) => b.score - a.score)) {
    const list = groups.get(match.item.group);
    if (list) list.push(match);
    else groups.set(match.item.group, [match]);
  }
  return [...groups.values()].flat();
}
