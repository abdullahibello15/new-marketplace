import { Fragment, useMemo, useState } from 'react';
import { FileSpreadsheetIcon } from 'lucide-react';
import { ImportRowEditor } from './ImportRowEditor';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { checkRow, type ImportRow, type RowCheck } from '../../utils/productImport';
import type { NewProductInput } from '../../types/marketplace';

interface ImportPreviewProps {
  fileName: string;
  rows: ImportRow[];
  ignoredColumns: string[];
  existingNames: Set<string>;
  onRowsChange: (rows: ImportRow[]) => void;
  onImport: (products: NewProductInput[]) => void;
  onReset: () => void;
}

type Status = 'ready' | 'warning' | 'invalid' | 'skipped';

const statusStyle: Record<Status, {label: string;className: string;}> = {
  ready: { label: 'Ready', className: 'bg-[#E3EEEC] text-pine' },
  warning: { label: 'Check', className: 'bg-[#FBEFD2] text-mustard-dark' },
  invalid: { label: 'Needs fixing', className: 'bg-clay-soft text-clay-dark' },
  skipped: { label: 'Skipped', className: 'bg-sand text-muted' }
};

function statusOf(row: ImportRow, check: RowCheck): Status {
  if (row.skipped) return 'skipped';
  if (check.errors.length) return 'invalid';
  return check.warnings.length ? 'warning' : 'ready';
}

function StatusBlock({ status, check }: {status: Status;check: RowCheck;}) {
  return (
    <>
      <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${statusStyle[status].className}`}>
        {statusStyle[status].label}
      </span>
      {status !== 'skipped' && (check.errors.length > 0 || check.warnings.length > 0) &&
      <ul className="mt-1.5 space-y-0.5 text-xs">
          {check.errors.map((e) =>
        <li key={e.message} className="font-medium text-clay-dark">{e.message}</li>
        )}
          {check.warnings.map((w) =>
        <li key={w} className="text-mustard-dark">{w}</li>
        )}
        </ul>
      }
    </>);

}

interface RowActionsProps {
  row: ImportRow;
  status: Status;
  editing: boolean;
  onToggleEdit: () => void;
  onToggleSkip: () => void;
}

function RowActions({ row, status, editing, onToggleEdit, onToggleSkip }: RowActionsProps) {
  const fixLabel = status === 'invalid' ? 'Fix' : 'Edit';
  return (
    <>
      {!row.skipped &&
      <button
        type="button"
        onClick={onToggleEdit}
        aria-expanded={editing}
        aria-label={`${fixLabel} row ${row.line}`}
        className="rounded-lg px-2.5 py-1.5 text-sm font-bold text-pine hover:bg-sand focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

          {fixLabel}
        </button>
      }
      <button
        type="button"
        onClick={onToggleSkip}
        aria-label={`${row.skipped ? 'Include' : 'Skip'} row ${row.line}`}
        className="rounded-lg px-2.5 py-1.5 text-sm font-bold text-muted hover:bg-sand hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

        {row.skipped ? 'Include' : 'Skip'}
      </button>
    </>);

}

const blank = <em className="font-medium text-muted">blank</em>;

export function ImportPreview({ fileName, rows, ignoredColumns, existingNames, onRowsChange, onImport, onReset }: ImportPreviewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [problemsOnly, setProblemsOnly] = useState(false);
  // Phones get stacked cards so each row's status and actions are visible without scrolling sideways.
  const wide = useMediaQuery('(min-width: 768px)');

  // Re-check every row on each change so duplicate-name warnings stay correct across rows.
  const checked = useMemo(() => {
    const firstLineByName = new Map<string, number>();
    return rows.map((row) => {
      const key = row.raw.name.trim().toLowerCase();
      let duplicateOf: number | undefined;
      if (key && !row.skipped) {
        if (firstLineByName.has(key)) duplicateOf = firstLineByName.get(key);else
        firstLineByName.set(key, row.line);
      }
      const check = checkRow(row.raw, { existingNames, duplicateOf });
      return { row, check, status: statusOf(row, check) };
    });
  }, [rows, existingNames]);

  const count = (s: Status) => checked.filter((c) => c.status === s).length;
  const importable = checked.flatMap(({ row, check }) => row.skipped || !check.product ? [] : [check.product]);
  const unresolved = count('invalid');
  const visibleRows = problemsOnly ? checked.filter((c) => c.status === 'invalid' || c.status === 'warning') : checked;

  const update = (id: string, patch: Partial<ImportRow>) => onRowsChange(rows.map((r) => r.id === id ? { ...r, ...patch } : r));
  const actionsFor = (r: ImportRow, status: Status) =>
  <RowActions
    row={r}
    status={status}
    editing={editingId === r.id}
    onToggleEdit={() => setEditingId(editingId === r.id ? null : r.id)}
    onToggleSkip={() => {
      update(r.id, { skipped: !r.skipped });
      if (editingId === r.id) setEditingId(null);
    }} />;

  const editorFor = (r: ImportRow, check: RowCheck) =>
  <ImportRowEditor
    raw={r.raw}
    errors={check.errors}
    onChange={(column, value) => update(r.id, { raw: { ...r.raw, [column]: value } })}
    onDone={() => setEditingId(null)} />;


  const importButton =
  <button
    type="button"
    disabled={importable.length === 0}
    onClick={() => onImport(importable)}
    className="rounded-xl bg-clay px-5 py-3 text-[15px] font-bold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-clay-dark active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-50">

      Import {importable.length} {importable.length === 1 ? 'product' : 'products'}
    </button>;


  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 lg:flex-row lg:items-center lg:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <FileSpreadsheetIcon className="mt-0.5 h-5 w-5 shrink-0 text-pine" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{fileName}</p>
            <p className="mt-0.5 text-sm text-muted" aria-live="polite">
              {rows.length} {rows.length === 1 ? 'row' : 'rows'} · {count('ready') + count('warning')} ready ·{' '}
              <span className={unresolved ? 'font-semibold text-clay-dark' : ''}>{unresolved} need fixing</span> · {count('skipped')}{' '}
              skipped
            </p>
            {ignoredColumns.length > 0 &&
            <p className="mt-1 text-xs text-muted">Ignored columns: {ignoredColumns.join(', ')}</p>
            }
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl bg-sand px-4 py-3 text-[15px] font-bold text-ink transition-colors duration-150 hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

            Choose another file
          </button>
          {importButton}
        </div>
      </div>

      {unresolved > 0 &&
      <p className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">
          Fix the {unresolved === 1 ? 'row' : `${unresolved} rows`} marked “Needs fixing”, or skip {unresolved === 1 ? 'it' : 'them'}. Rows
          that still have problems won’t be imported.
        </p>
      }

      <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          checked={problemsOnly}
          onChange={(e) => setProblemsOnly(e.target.checked)}
          className="h-4 w-4 rounded border-line text-pine focus:ring-pine/40" />

        Only show rows that need attention
      </label>

      {visibleRows.length === 0 ?
      <p className="rounded-2xl border border-line bg-white px-4 py-8 text-center text-muted">Every row is ready to import.</p> :
      wide ?
      <div className="relative overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[800px] text-left text-sm">
            <caption className="sr-only">Products found in {fileName}</caption>
            <thead className="border-b border-line bg-sand/60 text-xs font-bold uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="w-14 px-4 py-3">Row</th>
                <th scope="col" className="px-3 py-3">Name</th>
                <th scope="col" className="px-3 py-3">Category</th>
                <th scope="col" className="px-3 py-3">Price</th>
                <th scope="col" className="px-3 py-3">Stock</th>
                <th scope="col" className="w-[30%] px-3 py-3">Status</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibleRows.map(({ row: r, check, status }) =>
            <Fragment key={r.id}>
                  <tr className={`align-top ${status === 'skipped' ? 'text-muted' : 'text-ink'}`}>
                    <td className="px-4 py-3 tabular-nums text-muted">{r.line}</td>
                    <td className="max-w-[14rem] px-3 py-3 font-bold">
                      <span className="line-clamp-2">{r.raw.name || blank}</span>
                    </td>
                    <td className="px-3 py-3">{r.raw.category || blank}</td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums">{r.raw.price || blank}</td>
                    <td className="px-3 py-3 tabular-nums">{r.raw.stock || blank}</td>
                    <td className="px-3 py-3">
                      <StatusBlock status={status} check={check} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{actionsFor(r, status)}</td>
                  </tr>
                  {editingId === r.id &&
              <tr>
                      <td colSpan={7} className="bg-cream px-4 py-4">{editorFor(r, check)}</td>
                    </tr>
              }
                </Fragment>
            )}
            </tbody>
          </table>
        </div> :

      <ul className="space-y-3" aria-label={`Products found in ${fileName}`}>
          {visibleRows.map(({ row: r, check, status }) =>
        <li key={r.id} className={`rounded-2xl border border-line bg-white p-4 ${status === 'skipped' ? 'text-muted' : 'text-ink'}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted">Row {r.line}</p>
                  <p className="mt-0.5 font-bold">{r.raw.name || blank}</p>
                  <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                    <div className="flex gap-1"><dt className="text-muted">Category</dt><dd>{r.raw.category || blank}</dd></div>
                    <div className="flex gap-1"><dt className="text-muted">Price</dt><dd className="tabular-nums">{r.raw.price || blank}</dd></div>
                    <div className="flex gap-1"><dt className="text-muted">Stock</dt><dd className="tabular-nums">{r.raw.stock || blank}</dd></div>
                  </dl>
                </div>
                <div className="-mr-2 -mt-1 flex shrink-0">{actionsFor(r, status)}</div>
              </div>
              <div className="mt-2">
                <StatusBlock status={status} check={check} />
              </div>
              {editingId === r.id &&
          <div className="-mx-4 -mb-4 mt-4 rounded-b-2xl border-t border-line bg-cream p-4">{editorFor(r, check)}</div>
          }
            </li>
        )}
        </ul>
      }

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {unresolved > 0 &&
        <p className="text-sm text-muted sm:mr-auto">
            {unresolved} {unresolved === 1 ? 'row' : 'rows'} with problems will be skipped.
          </p>
        }
        {importButton}
      </div>
    </div>);

}
