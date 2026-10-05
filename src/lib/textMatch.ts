/**
 * Search matching that feels natural while typing: "pl" finds "Plumbing" and "Pipe & plumbing" but not
 * "Split". Each typed word must start some word in the text. Both inputs are compared lower-cased;
 * pass an already-normalised query (see normalizeSearch).
 */
export function matchesWordPrefixes(text: string, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return normalizedQuery.split(' ').every((part) => words.some((w) => w.startsWith(part)));
}
