import { useTranslation } from 'react-i18next';
import { productCategoryLabel } from '../../i18n/labels';
import { useId } from 'react';
import { bad, field, label, ok } from './formStyles';
import { productCategories } from '../../data/productCategories';
import { matchCategory, parseAvailable } from '../../utils/products';
import type { ImportColumn, RawProductRow, RowError } from '../../utils/productImport';

interface ImportRowEditorProps {
  raw: RawProductRow;
  errors: RowError[];
  onChange: (column: ImportColumn, value: string) => void;
  onDone: () => void;
}

const compact = field.replace('px-4 py-3', 'px-3 py-2');

/** Inline fixer for one spreadsheet row. Edits the raw text so the row is re-checked exactly like the file was. */
export function ImportRowEditor({ raw, errors, onChange, onDone }: ImportRowEditorProps) {
  const { t } = useTranslation();
  const uid = useId();
  const category = matchCategory(raw.category);
  const availability = parseAvailable(raw.available);
  const has = (column: ImportColumn) => errors.some((e) => e.column === column);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2">
        <label htmlFor={`${uid}-name`} className={label}>{t('vendor:products.name')}</label>
        <input
          id={`${uid}-name`}
          autoFocus
          value={raw.name}
          onChange={(e) => onChange('name', e.target.value)}
          className={`${compact} ${has('name') ? bad : ok}`} />

      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${uid}-category`} className={label}>{t('vendor:products.category')}</label>
        <select
          id={`${uid}-category`}
          value={category ?? raw.category}
          onChange={(e) => onChange('category', productCategories.find((c) => c.id === e.target.value)?.label ?? '')}
          className={`${compact} ${has('category') ? bad : ok}`}>

          {!category &&
          <option value={raw.category} disabled>
              {raw.category ? t('import.chooseFor', { value: raw.category }) : t('vendor:products.err.category')}
            </option>
          }
          {productCategories.map((c) =>
          <option key={c.id} value={c.id}>{productCategoryLabel(c.id, c.label)}</option>
          )}
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-price`} className={label}>{t('vendor:quote.price')}</label>
        <input
          id={`${uid}-price`}
          inputMode="numeric"
          value={raw.price}
          onChange={(e) => onChange('price', e.target.value)}
          className={`${compact} ${has('price') ? bad : ok}`} />

      </div>
      <div>
        <label htmlFor={`${uid}-stock`} className={label}>{t('vendor:products.qty.stock')}</label>
        <input
          id={`${uid}-stock`}
          inputMode="numeric"
          value={raw.stock}
          onChange={(e) => onChange('stock', e.target.value)}
          className={`${compact} ${has('stock') ? bad : ok}`} />

      </div>
      <div>
        <label htmlFor={`${uid}-available`} className={label}>{t('vendor:products.available')}</label>
        <select
          id={`${uid}-available`}
          value={availability === null ? raw.available : availability ? 'yes' : 'no'}
          onChange={(e) => onChange('available', e.target.value)}
          className={`${compact} ${has('available') ? bad : ok}`}>

          {availability === null && <option value={raw.available} disabled>“{raw.available}”</option>}
          <option value="yes">{t('import.yes')}</option>
          <option value="no">{t('import.no')}</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-images`} className={label}>{t('import.imageLinks')}</label>
        <input
          id={`${uid}-images`}
          value={raw.image_urls}
          onChange={(e) => onChange('image_urls', e.target.value)}
          placeholder="https://… | https://…"
          className={`${compact} ${has('image_urls') ? bad : ok}`} />

      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label htmlFor={`${uid}-description`} className={label}>{t('vendor:products.description')}</label>
        <input
          id={`${uid}-description`}
          value={raw.description}
          onChange={(e) => onChange('description', e.target.value)}
          className={`${compact} ${has('description') ? bad : ok}`} />

      </div>
      <div className="flex items-end">
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-xl bg-pine-deep px-4 py-2.5 text-sm font-bold text-white transition-colors duration-150 hover:bg-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2">

          {t('action.done')}
        </button>
      </div>
    </div>);

}

export interface ImportField<C extends string> {
  column: C;
  label: string;
  /** Select fields list their options; the stored value is the option's value. */
  options?: {value: string;label: string;}[];
  /** Grid columns it spans (1–4). */
  span?: 1 | 2 | 3 | 4;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  placeholder?: string;
}

const SPAN = { 1: '', 2: 'sm:col-span-2', 3: 'sm:col-span-2 lg:col-span-3', 4: 'sm:col-span-2 lg:col-span-4' } as const;

/**
 * Generic inline fixer for one spreadsheet row, driven by a field list (the bulk vendor import uses it).
 * Like the product editor, it edits the raw text so the row is re-checked exactly like the file was.
 */
export function ImportFieldsEditor<C extends string>({ fields, raw, errorColumns, onChange, onDone }: {fields: ImportField<C>[];raw: Record<C, string>;errorColumns: ReadonlySet<C>;onChange: (column: C, value: string) => void;onDone: () => void;}) {
  const { t } = useTranslation();
  const uid = useId();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {fields.map((f, i) => {
        const id = `${uid}-${f.column}`;
        const tone = errorColumns.has(f.column) ? bad : ok;
        const known = f.options?.some((o) => o.value === raw[f.column]);
        return (
          <div key={f.column} className={SPAN[f.span ?? 1]}>
            <label htmlFor={id} className={label}>{f.label}</label>
            {f.options ?
            <select id={id} autoFocus={i === 0} value={raw[f.column]} onChange={(e) => onChange(f.column, e.target.value)} className={`${compact} ${tone}`}>
                {!known && <option value={raw[f.column]} disabled>{raw[f.column] ? t('import.chooseOneFor', { value: raw[f.column] }) : t('import.chooseOne')}</option>}
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select> :

            <input
              id={id}
              autoFocus={i === 0}
              inputMode={f.inputMode}
              placeholder={f.placeholder}
              value={raw[f.column]}
              onChange={(e) => onChange(f.column, e.target.value)}
              className={`${compact} ${tone}`} />

            }
          </div>);

      })}
      <div className="flex items-end">
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-xl bg-pine-deep px-4 py-2.5 text-sm font-bold text-white transition-colors duration-150 hover:bg-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2">

          {t('action.done')}
        </button>
      </div>
    </div>);

}
