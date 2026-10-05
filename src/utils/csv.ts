/** Byte-order mark: Excel adds it to UTF-8 CSVs, and needs it to read them back as UTF-8. */
export const BOM = String.fromCharCode(0xfeff);

/** Picks the delimiter from the first line: Excel in some locales saves CSV with ";" instead of ",". */
function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const best = [',', ';', '\t'].
  map((d) => ({ d, count: firstLine.split(d).length - 1 })).
  reduce((a, b) => b.count > a.count ? b : a);
  return best.count > 0 ? best.d : ',';
}

/** RFC 4180 CSV: quoted fields, "" escapes, and newlines inside quotes. */
export function parseCsv(input: string): string[][] {
  const text = input.startsWith(BOM) ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === '') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function toCsv(rows: string[][]): string {
  const escape = (v: string) => /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return rows.map((r) => r.map(escape).join(',')).join('\r\n');
}
