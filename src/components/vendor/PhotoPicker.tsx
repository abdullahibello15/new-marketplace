import { useId, useRef, useState } from 'react';
import { ImagePlusIcon, XIcon } from 'lucide-react';
import { Lightbox } from '../Lightbox';

interface PhotoPickerProps {
  photos: string[];
  problems: string[];
  max: number;
  isUnsaved: (url: string) => boolean;
  onAddFiles: (files: File[]) => void;
  onRemove: (url: string) => void;
  /** Used for lightbox alt text. */
  altPrefix: string;
  invalid?: boolean;
  /** Extra id to pass to aria-describedby on the add button, e.g. a field error. */
  describedBy?: string;
}

/** Thumbnail grid with add tile, remove buttons, "New" tags and a preview lightbox. State lives in usePhotoDraft. */
export function PhotoPicker({ photos, problems, max, isUnsaved, onAddFiles, onRemove, altPrefix, invalid, describedBy }: PhotoPickerProps) {
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const slotsLeft = max - photos.length;

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold text-muted">
          {photos.length}/{max} photos
        </p>
        <p id={`${uid}-hint`} className="text-xs font-medium text-muted">JPG or PNG, up to 5 MB each</p>
      </div>

      <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {photos.map((url, i) => {
          const unsaved = isUnsaved(url);
          return (
            <li key={url} className="relative">
              <button
                type="button"
                onClick={() => setPreview(i)}
                aria-label={`Preview photo ${i + 1}${unsaved ? ' (not saved yet)' : ''}`}
                className="block w-full overflow-hidden rounded-xl ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine">

                <img src={url} alt="" className="aspect-square w-full object-cover transition-transform duration-200 hover:scale-[1.03]" />
              </button>
              {unsaved &&
              <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-md bg-mustard px-1.5 py-0.5 text-[11px] font-bold text-ink">
                  New
                </span>
              }
              <button
                type="button"
                onClick={() => onRemove(url)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-white transition-colors duration-150 hover:bg-clay-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white">

                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>);

        })}
        {slotsLeft > 0 &&
        <li>
            <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-describedby={[`${uid}-hint`, describedBy].filter(Boolean).join(' ')}
            className={`flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-muted transition-colors duration-150 hover:border-pine/40 hover:text-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
            invalid ? 'border-clay' : 'border-line'}`
            }>

              <ImagePlusIcon className="h-6 w-6" aria-hidden="true" />
              <span className="text-xs font-bold">Add photos</span>
            </button>
          </li>
        }
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        onChange={(e) => {
          onAddFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true" />


      <div aria-live="polite">
        {problems.length > 0 &&
        <ul className="mt-3 space-y-1 rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">
            {problems.map((p) =>
          <li key={p}>{p}</li>
          )}
          </ul>
        }
      </div>

      <Lightbox photos={photos} index={preview} onIndexChange={setPreview} onClose={() => setPreview(null)} altPrefix={altPrefix} />
    </>);

}
