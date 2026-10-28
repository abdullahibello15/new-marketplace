import { Fragment, useMemo, useState } from 'react';
import { DownloadIcon, FileSpreadsheetIcon, Trash2Icon, WandSparklesIcon } from 'lucide-react';
import { nigerLgas } from '../../../../data/nigerLgas';
import { Button } from '../../../../components/ui/Button';
import { SegmentedControl } from '../../../../components/ui/SegmentedControl';
import { ImportFieldsEditor, type ImportField } from '../../../../components/vendor/ImportRowEditor';
import { ImportStatusBlock, type ImportRowTone } from '../../../../components/vendor/ImportStatus';
import { formatLocalPhone } from '../../../../utils/phone';
import { csvWithBom, downloadText } from '../../../../utils/spreadsheetImport';
import { COLUMN_LABELS, TRADE_SELECT_OPTIONS, type VendorImportRow } from '../../bulk/vendorImport';
import { VENDOR_IMPORT_COLUMNS, type ExistingChoice, type VendorImportColumn, type VendorRowCheck, type VendorRowStatus } from '../../bulk/types';

type Filter = 'all' | VendorRowStatus;

const TONE: Record<VendorRowStatus, ImportRowTone> = { valid: 'ready', warning: 'warning', error: 'invalid' };
const STATUS_LABEL: Record<VendorRowStatus, string> = { valid: 'Valid', warning: 'Warning', error: 'Error' };

const FIELDS: ImportField<VendorImportColumn>[] = [
{ column: 'full_name', label: COLUMN_LABELS.full_name },
{ column: 'business_name', label: COLUMN_LABELS.business_name },
{ column: 'phone', label: COLUMN_LABELS.phone, inputMode: 'tel', placeholder: '0803 123 4567' },
{ column: 'email', label: COLUMN_LABELS.email, inputMode: 'email' },
{ column: 'trade_category', label: COLUMN_LABELS.trade_category, options: TRADE_SELECT_OPTIONS },
{ column: 'lga', label: COLUMN_LABELS.lga, options: nigerLgas.map((l) => ({ value: l, label: l })) },
{ column: 'town_landmark', label: COLUMN_LABELS.town_landmark, span: 2 },
{ column: 'years_experience', label: COLUMN_LABELS.years_experience, inputMode: 'numeric' },
{ column: 'service_areas', label: `${COLUMN_LABELS.service_areas} (separate with ;)`, span: 2 },
{ column: 'bio', label: COLUMN_LABELS.bio, span: 3 }];


interface VendorImportReviewProps {
  fileName: string;
  ignoredColumns: string[];
  rows: VendorImportRow[];
  checks: VendorRowCheck[];
  choices: Record<string, ExistingChoice>;
  onRowsChange: (rows: VendorImportRow[]) => void;
  onChoice: (rowId: string, choice: ExistingChoice) => void;
  onReset: () => void;
}

/**
 * Step 3: every row checked in the browser, with its status (Valid, Warning, Error), what's wrong, one-click
 * "did you mean…?" fixes, Skip or Link for vendors who already exist, inline editing and deleting.
 */
export function VendorImportReview({ fileName, ignoredColumns, rows, checks, choices, onRowsChange, onChoice, onReset }: VendorImportReviewProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const items = useMemo(() => rows.map((row, i) => ({ row, check: checks[i] })), [rows, checks]);
  const count = (s: VendorRowStatus) => items.filter((x) => x.check.status === s).length;
  const visible = filter === 'all' ? items : items.filter((x) => x.check.status === filter);
  const suggestionCount = items.reduce((n, x) => n + x.check.suggestions.length, 0);

  const updateRow = (id: string, patch: Partial<Record<VendorImportColumn, string>>) =>
  onRowsChange(rows.map((r) => r.id === id ? { ...r, raw: { ...r.raw, ...patch } } : r));
  const deleteRow = (id: string) => {
    if (editingId === id) setEditingId(null);
    onRowsChange(rows.filter((r) => r.id !== id));
  };
  const applyAll = () =>
  onRowsChange(rows.map((r, i) => checks[i].suggestions.length ? { ...r, raw: { ...r.raw, ...Object.fromEntries(checks[i].suggestions.map((s) => [s.column, s.value])) } } : r));

  function downloadErrors() {
    const bad = items.filter((x) => x.check.status === 'error');
    downloadText(
      `${fileName.replace(/\.[^.]+$/, '')}-errors.csv`,
      csvWithBom([['row', ...VENDOR_IMPORT_COLUMNS, 'errors'], ...bad.map(({ row, check }) => [row.line, ...VENDOR_IMPORT_COLUMNS.map((c) => row.raw[c]), check.errors.map((e) => e.message).join(' | ')])])
    );
  }

  const filters: {id: Filter;label: string;}[] = [
  { id: 'all', label: `All (${items.length})` },
  { id: 'valid', label: `Valid (${count('valid')})` },
  { id: 'warning', label: `Warning (${count('warning')})` },
  { id: 'error', label: `Error (${count('error')})` }];


  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 lg:flex-row lg:items-center lg:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <FileSpreadsheetIcon className="mt-0.5 h-5 w-5 shrink-0 text-pine" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{fileName}</p>
            <p className="mt-0.5 text-sm text-muted" aria-live="polite">
              {items.length} {items.length === 1 ? 'row' : 'rows'} · <span className="text-pine">{count('valid')} valid</span> · <span className="text-mustard-dark">{count('warning')} with warnings</span> ·{' '}
              <span className={count('error') ? 'font-semibold text-clay-dark' : ''}>{count('error')} with errors</span>
            </p>
            {ignoredColumns.length > 0 && <p className="mt-1 text-xs text-muted">Ignored columns: {ignoredColumns.join(', ')}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestionCount > 0 && <Button variant="outline" size="sm" icon={WandSparklesIcon} onClick={applyAll}>Apply {suggestionCount} {suggestionCount === 1 ? 'suggestion' : 'suggestions'}</Button>}
          <Button variant="outline" size="sm" icon={DownloadIcon} disabled={count('error') === 0} onClick={downloadErrors}>Download the errors as CSV</Button>
          <Button variant="secondary" size="sm" onClick={onReset}>Choose another file</Button>
        </div>
      </div>

      {count('error') > 0 &&
      <p className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">
          Fix or delete the {count('error') === 1 ? 'row' : `${count('error')} rows`} with errors. Rows that still have errors won’t be imported (they’re listed as skipped).
        </p>
      }

      <div className="overflow-x-auto">
        <SegmentedControl<Filter> label="Show rows" options={filters} value={filter} onChange={setFilter} />
      </div>

      {visible.length === 0 ?
      <p className="rounded-2xl border border-line bg-white px-4 py-8 text-center text-muted">No rows with this status.</p> :

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[960px] text-left text-sm">
            <caption className="sr-only">Vendors found in {fileName}</caption>
            <thead className="border-b border-line bg-sand/60 text-xs font-bold uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="w-14 px-4 py-3">Row</th>
                <th scope="col" className="px-3 py-3">Vendor</th>
                <th scope="col" className="px-3 py-3">Phone</th>
                <th scope="col" className="px-3 py-3">Trade · LGA</th>
                <th scope="col" className="w-[34%] px-3 py-3">Status</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map(({ row, check }) => {
              const phone = check.profile?.phone;
              return (
                <Fragment key={row.id}>
                    <tr className="align-top">
                      <td className="px-4 py-3 tabular-nums text-muted">{row.line}</td>
                      <td className="px-3 py-3">
                        <p className="font-bold">{row.raw.business_name || <em className="font-medium text-muted">no business name</em>}</p>
                        <p className="text-xs text-muted">{row.raw.full_name || 'no name'}{row.raw.email && ` · ${row.raw.email}`}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                        {phone ? formatLocalPhone(phone) : row.raw.phone || <em className="text-muted">blank</em>}
                        {phone && phone !== row.raw.phone && <p className="text-xs text-muted">was “{row.raw.phone}”</p>}
                      </td>
                      <td className="px-3 py-3">{row.raw.trade_category || '—'} · {row.raw.lga || '—'}</td>
                      <td className="px-3 py-3">
                        <ImportStatusBlock tone={TONE[check.status]} label={STATUS_LABEL[check.status]} errors={check.errors.map((e) => e.message)} warnings={check.warnings} />
                        {check.suggestions.map((s) =>
                      <p key={s.column} className="mt-1 text-xs">
                            Did you mean <strong>{s.label}</strong>?{' '}
                            <button type="button" onClick={() => updateRow(row.id, { [s.column]: s.value })} className="font-bold text-pine underline underline-offset-2 hover:text-pine-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
                              Use it<span className="sr-only"> for row {row.line} {COLUMN_LABELS[s.column]}</span>
                            </button>
                          </p>
                      )}
                        {check.existing?.kind === 'vendor' && !check.existing.alreadyMember && check.status !== 'error' &&
                      <fieldset className="mt-2">
                            <legend className="text-xs font-semibold text-muted">Existing vendor: {check.existing.vendorName}</legend>
                            <div className="mt-1 flex gap-3 text-sm">
                              {(['skip', 'link'] as const).map((c) =>
                          <label key={c} className="inline-flex items-center gap-1.5">
                                  <input type="radio" name={`choice-${row.id}`} checked={(choices[row.id] ?? 'skip') === c} onChange={() => onChoice(row.id, c)} className="h-4 w-4 border-line text-pine focus:ring-pine/40" />
                                  {c === 'skip' ? 'Skip' : 'Link to the association'}
                                </label>
                          )}
                            </div>
                          </fieldset>
                      }
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                        type="button"
                        onClick={() => setEditingId(editingId === row.id ? null : row.id)}
                        aria-expanded={editingId === row.id}
                        aria-label={`Edit row ${row.line}`}
                        className="rounded-lg px-2.5 py-1.5 text-sm font-bold text-pine hover:bg-sand focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

                          {check.status === 'error' ? 'Fix' : 'Edit'}
                        </button>
                        <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        aria-label={`Delete row ${row.line}`}
                        className="rounded-lg p-1.5 text-muted hover:bg-sand hover:text-clay-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

                          <Trash2Icon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                    {editingId === row.id &&
                  <tr>
                        <td colSpan={6} className="bg-cream px-4 py-4">
                          <ImportFieldsEditor
                        fields={FIELDS}
                        raw={row.raw}
                        errorColumns={new Set(check.errors.map((e) => e.column))}
                        onChange={(column, value) => updateRow(row.id, { [column]: value })}
                        onDone={() => setEditingId(null)} />

                        </td>
                      </tr>
                  }
                  </Fragment>);

            })}
            </tbody>
          </table>
        </div>
      }
    </div>);

}
