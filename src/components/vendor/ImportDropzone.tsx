import React, { useRef, useState } from 'react';
import { DownloadIcon, FileUpIcon } from 'lucide-react';
import { productCategories } from '../../data/productCategories';
import { buildTemplateCsv } from '../../utils/productImport';
import { PRODUCT_IMAGES_MAX } from '../../utils/products';

interface ImportDropzoneProps {
  onFile: (file: File) => void;
  reading: boolean;
  error: string;
}

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gwani-products-template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before freeing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const columns: {name: string;required: boolean;help: string;}[] = [
{ name: 'name', required: true, help: `Up to 80 characters.` },
{ name: 'category', required: true, help: productCategories.map((c) => c.label).join(', ') },
{ name: 'price', required: true, help: 'Naira, numbers only, e.g. 9500. "₦9,500" also works.' },
{ name: 'stock', required: true, help: 'Whole number, e.g. 12. Use 0 if sold out.' },
{ name: 'description', required: false, help: 'Up to 500 characters.' },
{ name: 'available', required: false, help: 'yes or no. Blank means yes.' },
{
  name: 'image_urls',
  required: false,
  help: `Up to ${PRODUCT_IMAGES_MAX} web links separated by |. Products without one import hidden until you add a photo.`
}];


export function ImportDropzone({ onFile, reading, error }: ImportDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-150 ${
          error ? 'border-clay bg-clay-soft/40' : dragging ? 'border-pine bg-[#E3EEEC]' : 'border-line bg-white'}`
          }>

          <FileUpIcon className="h-9 w-9 text-muted" aria-hidden="true" />
          <p className="mt-3 font-bold text-ink">{reading ? 'Reading your file…' : 'Drop your spreadsheet here'}</p>
          <p className="mt-1 text-sm text-muted">.csv or .xlsx, up to 2 MB and 500 products. Only the first sheet is read.</p>
          <button
            type="button"
            disabled={reading}
            onClick={() => inputRef.current?.click()}
            aria-describedby={error ? 'import-file-error' : undefined}
            className="mt-5 rounded-xl bg-pine-deep px-5 py-3 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2 disabled:opacity-60">

            Choose file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) onFile(file);
            }}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true" />

        </div>
        <div aria-live="assertive">
          {error &&
          <p id="import-file-error" className="mt-3 rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">
              {error}
            </p>
          }
        </div>
      </div>

      <aside aria-labelledby="template-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
        <h2 id="template-heading" className="text-base font-bold text-ink">Start from the template</h2>
        <p className="mt-0.5 text-sm text-muted">Open it in Excel or Google Sheets, add one product per row, then upload it here.</p>
        <button
          type="button"
          onClick={downloadTemplate}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sand px-4 py-3 text-[15px] font-bold text-ink transition-colors duration-150 hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

          <DownloadIcon className="h-5 w-5" aria-hidden="true" />
          Download CSV template
        </button>
        <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-muted">Columns</h3>
        <dl className="mt-2 space-y-2.5 text-sm">
          {columns.map((c) =>
          <div key={c.name}>
              <dt className="font-mono text-[13px] font-bold text-ink">
                {c.name}
                {c.required && <span className="ml-1.5 font-sans text-xs font-semibold text-clay-dark">required</span>}
              </dt>
              <dd className="text-muted">{c.help}</dd>
            </div>
          )}
        </dl>
      </aside>
    </div>);

}
