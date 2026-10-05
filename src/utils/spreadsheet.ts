import { parseCsv } from './csv';

export const MAX_SPREADSHEET_BYTES = 2 * 1024 * 1024;

export class SpreadsheetError extends Error {}

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  if (typeof cell === 'boolean') return cell ? 'yes' : 'no';
  return String(cell);
}

/** Reads the first sheet of a .csv or .xlsx file into rows of strings, entirely in the browser. */
export async function readSpreadsheet(file: File): Promise<string[][]> {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'xls') {
    throw new SpreadsheetError('Old .xls files aren’t supported. In Excel, choose File › Save As and pick .xlsx or .csv.');
  }
  if (ext !== 'csv' && ext !== 'xlsx') throw new SpreadsheetError('Upload a .csv or .xlsx file.');
  if (file.size > MAX_SPREADSHEET_BYTES) throw new SpreadsheetError('That file is over 2 MB. Split it into smaller files.');

  try {
    if (ext === 'csv') return parseCsv(await file.text());
    // Loaded on demand so the xlsx reader isn't in the main bundle.
    const { readSheet } = await import('read-excel-file/browser');
    const data = await readSheet(file);
    return data.map((row) => row.map(cellToString));
  } catch {
    throw new SpreadsheetError('We couldn’t read this file. Check that it opens in Excel or Google Sheets, then try again.');
  }
}
