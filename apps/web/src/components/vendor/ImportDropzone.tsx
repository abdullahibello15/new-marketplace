import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import React, { useRef, useState, type ReactNode } from 'react';
import { DownloadIcon, FileUpIcon } from 'lucide-react';
import { productCategories } from '../../data/productCategories';
import { buildTemplateCsv } from '../../utils/productImport';
import { downloadText } from '../../utils/spreadsheetImport';
import { PRODUCT_IMAGES_MAX } from '../../utils/products';

export interface DropzoneColumn {
  name: string;
  required: boolean;
  help: string;
}

interface ImportDropzoneProps {
  onFile: (file: File) => void;
  reading: boolean;
  error: string;
  /** The rest default to the product import. */
  columns?: DropzoneColumn[];
  template?: {fileName: string;build: () => string;intro: string;};
  /** e.g. ".csv or .xlsx, up to 2 MB and 500 products. Only the first sheet is read." */
  limitsText?: string;
  /** Extra content under the template button (e.g. a sample file). */
  templateExtra?: ReactNode;
}

/** Built when shown, so the help text follows the language. Category names stay as the file expects them. */
const productColumns = (): DropzoneColumn[] => [
{ name: 'name', required: true, help: i18n.t('vendor:products.col.name', { max: 80 }) },
{ name: 'category', required: true, help: productCategories.map((c) => c.label).join(', ') },
{ name: 'price', required: true, help: i18n.t('vendor:products.col.price') },
{ name: 'stock', required: true, help: i18n.t('vendor:products.col.stock') },
{ name: 'description', required: false, help: i18n.t('vendor:products.col.description', { max: 500 }) },
{ name: 'available', required: false, help: i18n.t('vendor:products.col.available') },
{ name: 'image_urls', required: false, help: i18n.t('vendor:products.col.images', { max: PRODUCT_IMAGES_MAX }) }];


const productTemplate = () => ({
  fileName: 'gwani-products-template.csv',
  build: buildTemplateCsv,
  intro: i18n.t('vendor:products.templateIntro')
});

export function ImportDropzone({
  onFile,
  reading,
  error,
  columns: customColumns,
  template: customTemplate,
  limitsText: customLimits,
  templateExtra
}: ImportDropzoneProps) {
  const { t } = useTranslation();
  const columns = customColumns ?? productColumns();
  const template = customTemplate ?? productTemplate();
  const limitsText = customLimits ?? t('vendor:products.limits');
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
          <p className="mt-3 font-bold text-ink">{reading ? t('import.reading') : t('import.drop')}</p>
          <p className="mt-1 text-sm text-muted">{limitsText}</p>
          <button
            type="button"
            disabled={reading}
            onClick={() => inputRef.current?.click()}
            aria-describedby={error ? 'import-file-error' : undefined}
            className="mt-5 rounded-xl bg-pine-deep px-5 py-3 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2 disabled:opacity-60">

            {t('import.chooseFile')}
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
        <h2 id="template-heading" className="text-base font-bold text-ink">{t('import.templateTitle')}</h2>
        <p className="mt-0.5 text-sm text-muted">{template.intro}</p>
        <button
          type="button"
          onClick={() => downloadText(template.fileName, template.build())}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sand px-4 py-3 text-[15px] font-bold text-ink transition-colors duration-150 hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

          <DownloadIcon className="h-5 w-5" aria-hidden="true" />
          {t('import.downloadTemplate')}
        </button>
        {templateExtra}
        <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-muted">{t('import.columns')}</h3>
        <dl className="mt-2 space-y-2.5 text-sm">
          {columns.map((c) =>
          <div key={c.name}>
              <dt className="font-mono text-[13px] font-bold text-ink">
                {c.name}
                {c.required && <span className="ml-1.5 font-sans text-xs font-semibold text-clay-dark">{t('import.required')}</span>}
              </dt>
              <dd className="text-muted">{c.help}</dd>
            </div>
          )}
        </dl>
      </aside>
    </div>);

}
