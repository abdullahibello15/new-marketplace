import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, RotateCcwIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { DOCUMENT_TYPE_LABELS } from '../../constants';
import type { VerificationDocument } from '../../types';

const ZOOMS = [1, 1.5, 2, 3] as const;

interface DocumentViewerProps {
  documents: VerificationDocument[];
  index: number;
  onIndexChange: (index: number) => void;
}

/** One document at a time, with zoom and next/previous (also ← → and + − on the keyboard). */
export function DocumentViewer({ documents, index, onIndexChange }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(0);
  const doc = documents[index];
  if (!doc) return null;
  const go = (next: number) => {
    onIndexChange((next + documents.length) % documents.length);
    setZoom(0);
  };

  return (
    <section aria-labelledby="doc-viewer-heading" className="rounded-2xl border border-line bg-white p-3 lg:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="doc-viewer-heading" className="min-w-0 flex-1 font-bold text-ink">
          {DOCUMENT_TYPE_LABELS[doc.type]}
          <span className="ml-2 text-sm font-normal text-muted">
            {index + 1} of {documents.length}
          </span>
        </h2>
        <Button variant="secondary" size="sm" icon={ZoomOutIcon} onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} aria-label="Zoom out" />
        <span className="w-12 text-center text-sm font-semibold tabular-nums" aria-live="polite">{Math.round(ZOOMS[zoom] * 100)}%</span>
        <Button variant="secondary" size="sm" icon={ZoomInIcon} onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoom === ZOOMS.length - 1} aria-label="Zoom in" />
        <Button variant="secondary" size="sm" icon={RotateCcwIcon} onClick={() => setZoom(0)} disabled={zoom === 0} aria-label="Reset zoom" />
      </div>

      <div
        tabIndex={0}
        role="group"
        aria-label={`${DOCUMENT_TYPE_LABELS[doc.type]}. Use the arrow keys for the previous or next document, plus and minus to zoom.`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(index + 1);else
          if (e.key === 'ArrowLeft') go(index - 1);else
          if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(ZOOMS.length - 1, z + 1));else
          if (e.key === '-') setZoom((z) => Math.max(0, z - 1));else
          return;
          e.preventDefault();
        }}
        className="mt-3 h-[320px] overflow-auto rounded-xl bg-sand focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 sm:h-[420px]">

        <img
          src={doc.fileUrl}
          alt={`${DOCUMENT_TYPE_LABELS[doc.type]} uploaded by the vendor (specimen image)`}
          style={{ width: `${ZOOMS[zoom] * 100}%`, maxWidth: 'none' }}
          className="mx-auto block h-auto transition-[width] duration-150" />

      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button variant="outline" size="sm" icon={ChevronLeftIcon} onClick={() => go(index - 1)} disabled={documents.length < 2}>
          Previous
        </Button>
        <ol className="flex flex-1 justify-center gap-1.5" aria-label="Documents">
          {documents.map((d, i) =>
          <li key={d.id}>
              <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === index ? 'true' : undefined}
              aria-label={`${i + 1}: ${DOCUMENT_TYPE_LABELS[d.type]}`}
              className={`h-10 w-14 overflow-hidden rounded-md border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${i === index ? 'border-pine' : 'border-line'}`}>

                <img src={d.fileUrl} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          )}
        </ol>
        <Button variant="outline" size="sm" onClick={() => go(index + 1)} disabled={documents.length < 2}>
          Next
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </section>);

}
