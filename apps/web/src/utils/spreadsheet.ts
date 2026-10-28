import i18n from '../i18n';
import { parseCsv } from './csv';

export const MAX_SPREADSHEET_BYTES = 2 * 1024 * 1024;

export class SpreadsheetError extends Error {}

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  if (typeof cell === 'boolean') return cell ? 'yes' : 'no';
  return String(cell);
}

const sizeText = (bytes: number) => bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024) * 10) / 10} MB` : `${Math.round(bytes / 1024)} KB`;

/**
 * Reads the first sheet of a .csv or .xlsx file into rows of strings, entirely in the browser. The file
 * itself is never kept or uploaded; callers get the cells only.
 */
export async function readSpreadsheet(file: File, { maxBytes = MAX_SPREADSHEET_BYTES }: {maxBytes?: number;} = {}): Promise<string[][]> {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'xls') {
    throw new SpreadsheetError(i18n.t('common:spreadsheet.xls'));
  }
  if (ext !== 'csv' && ext !== 'xlsx') throw new SpreadsheetError(i18n.t('common:spreadsheet.type'));
  if (file.size > maxBytes) throw new SpreadsheetError(i18n.t('common:spreadsheet.size', { size: sizeText(maxBytes) }));

  try {
    if (ext === 'csv') return parseCsv(await file.text());
    // Loaded on demand so the xlsx reader isn't in the main bundle.
    const { readSheet } = await import('read-excel-file/browser');
    const data = await readSheet(file);
    return data.map((row) => row.map(cellToString));
  } catch {
    throw new SpreadsheetError(i18n.t('common:spreadsheet.unreadable'));
  }
}
