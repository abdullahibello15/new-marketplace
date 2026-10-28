import i18n from '../i18n';
import { BOM, toCsv } from './csv';

/*
 * Shared spreadsheet-import plumbing: map a sheet's header row to known columns, turn the rows under it
 * into editable raw rows, build a template, export rows as CSV, and suggest near-miss values. Used by
 * the vendor's product import and the admin's bulk vendor import; each supplies its own columns and checks.
 */

export interface ImportSpec<C extends string> {
  columns: readonly C[];
  required: readonly C[];
  /** Other header spellings, already normalised (lower case, spaces as _), mapped to a column. */
  aliases?: Readonly<Record<string, C>>;
  maxRows: number;
  /** "product" / "vendor", for messages. */
  noun: {one: string;many: string;};
}

export interface SpreadsheetRow<C extends string> {
  id: string;
  /** Row number as the person sees it in their spreadsheet (header is row 1 or later). */
  line: number;
  raw: Record<C, string>;
  skipped: boolean;
}

export const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[()]/g, '');

/** Finds the header row, maps it to the spec's columns, and reads every non-blank row under it. */
export function mapTableToRows<C extends string>(table: string[][], spec: ImportSpec<C>): {rows: SpreadsheetRow<C>[];ignoredColumns: string[];error?: string;} {
  const headerIndex = table.findIndex((r) => r.some((c) => c.trim()));
  if (headerIndex === -1) return { rows: [], ignoredColumns: [], error: i18n.t('common:spreadsheet.empty') };

  const header = table[headerIndex];
  const columnAt = new Map<C, number>();
  const ignoredColumns: string[] = [];
  header.forEach((h, i) => {
    const key = normalizeHeader(h);
    const column = (spec.columns as readonly string[]).includes(key) ? key as C : spec.aliases?.[key];
    if (column && !columnAt.has(column)) columnAt.set(column, i);else
    if (h.trim()) ignoredColumns.push(h.trim());
  });

  const missing = spec.required.filter((c) => !columnAt.has(c));
  if (missing.length) {
    return {
      rows: [],
      ignoredColumns,
      error: i18n.t('common:spreadsheet.missingColumns', { count: missing.length, columns: missing.join(', ') })
    };
  }

  const rows: SpreadsheetRow<C>[] = [];
  table.slice(headerIndex + 1).forEach((cells, i) => {
    if (!cells.some((c) => c.trim())) return;
    const raw = Object.fromEntries(
      spec.columns.map((c) => {
        const index = columnAt.get(c);
        return [c, index === undefined ? '' : (cells[index] ?? '').trim()];
      })
    ) as Record<C, string>;
    const line = headerIndex + i + 2;
    rows.push({ id: `row-${line}`, line, raw, skipped: false });
  });

  if (rows.length === 0) return { rows, ignoredColumns, error: i18n.t('common:spreadsheet.noRows', { noun: spec.noun.many }) };
  if (rows.length > spec.maxRows) {
    return { rows: [], ignoredColumns, error: i18n.t('common:spreadsheet.tooMany', { count: rows.length, noun: spec.noun.many, max: spec.maxRows }) };
  }
  return { rows, ignoredColumns };
}

/** A CSV with a BOM, so Excel opens it as UTF-8 and keeps characters like ₦ intact. */
export const csvWithBom = (rows: (string | number)[][]) => BOM + toCsv(rows.map((r) => r.map(String))) + '\r\n';

/** Saves text as a file download in the browser. */
export function downloadText(fileName: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before freeing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- "Did you mean…?" ---------- */

/** Edit distance (insertions, deletions, substitutions). */
export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

const simplify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Matches free text to one of a list of options. Exact (ignoring case, spaces and punctuation, and the
 * option's aliases) → `match`. Otherwise the closest option within a small edit distance, or one the text
 * contains or is contained in → `suggestion` for a "did you mean…?". Neither → both null.
 */
export function matchOption<T>(raw: string, options: readonly T[], namesOf: (option: T) => readonly string[], { ignoreWords = [] as readonly string[] } = {}): {match: T | null;suggestion: T | null;} {
  const strip = (s: string) => ignoreWords.reduce((acc, w) => acc.replace(new RegExp(`\\b${w}\\b`, 'g'), ' '), simplify(s)).replace(/\s+/g, ' ').trim();
  const text = simplify(raw);
  if (!text) return { match: null, suggestion: null };
  const exact = options.find((o) => namesOf(o).some((n) => simplify(n) === text));
  if (exact) return { match: exact, suggestion: null };

  const core = strip(raw);
  let best: {option: T;score: number;} | null = null;
  for (const o of options) {
    for (const name of namesOf(o)) {
      const n = simplify(name);
      if (!n) continue;
      const distance = editDistance(core, n);
      const contains = core.length >= 3 && (n.includes(core) || core.includes(n));
      const allowed = Math.max(1, Math.floor(n.length / 4));
      const score = core === n ? 0 : contains ? 0.5 : distance <= allowed ? distance : Infinity;
      if (score < (best?.score ?? Infinity)) best = { option: o, score };
    }
  }
  return { match: null, suggestion: best ? best.option : null };
}
