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
  const uid = useId();
  const category = matchCategory(raw.category);
  const availability = parseAvailable(raw.available);
  const has = (column: ImportColumn) => errors.some((e) => e.column === column);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2">
        <label htmlFor={`${uid}-name`} className={label}>Name</label>
        <input
          id={`${uid}-name`}
          autoFocus
          value={raw.name}
          onChange={(e) => onChange('name', e.target.value)}
          className={`${compact} ${has('name') ? bad : ok}`} />

      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${uid}-category`} className={label}>Category</label>
        <select
          id={`${uid}-category`}
          value={category ?? raw.category}
          onChange={(e) => onChange('category', productCategories.find((c) => c.id === e.target.value)?.label ?? '')}
          className={`${compact} ${has('category') ? bad : ok}`}>

          {!category &&
          <option value={raw.category} disabled>
              {raw.category ? `“${raw.category}” – choose a category` : 'Choose a category'}
            </option>
          }
          {productCategories.map((c) =>
          <option key={c.id} value={c.id}>{c.label}</option>
          )}
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-price`} className={label}>Price (₦)</label>
        <input
          id={`${uid}-price`}
          inputMode="numeric"
          value={raw.price}
          onChange={(e) => onChange('price', e.target.value)}
          className={`${compact} ${has('price') ? bad : ok}`} />

      </div>
      <div>
        <label htmlFor={`${uid}-stock`} className={label}>Stock</label>
        <input
          id={`${uid}-stock`}
          inputMode="numeric"
          value={raw.stock}
          onChange={(e) => onChange('stock', e.target.value)}
          className={`${compact} ${has('stock') ? bad : ok}`} />

      </div>
      <div>
        <label htmlFor={`${uid}-available`} className={label}>Available</label>
        <select
          id={`${uid}-available`}
          value={availability === null ? raw.available : availability ? 'yes' : 'no'}
          onChange={(e) => onChange('available', e.target.value)}
          className={`${compact} ${has('available') ? bad : ok}`}>

          {availability === null && <option value={raw.available} disabled>“{raw.available}”</option>}
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-images`} className={label}>Image links</label>
        <input
          id={`${uid}-images`}
          value={raw.image_urls}
          onChange={(e) => onChange('image_urls', e.target.value)}
          placeholder="https://… | https://…"
          className={`${compact} ${has('image_urls') ? bad : ok}`} />

      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label htmlFor={`${uid}-description`} className={label}>Description</label>
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

          Done
        </button>
      </div>
    </div>);

}
