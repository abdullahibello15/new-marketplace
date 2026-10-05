import { useState } from 'react';
import { Lightbox } from './Lightbox';

interface PortfolioGridProps {
  photos: string[];
  vendorName: string;
  /** Id of a visible heading that already names this section. Without it, a hidden "Portfolio" heading is added. */
  labelledBy?: string;
}

export function PortfolioGrid({ photos, vendorName, labelledBy }: PortfolioGridProps) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;

  // One photo fills the row; two sit side by side; three or more lead with a large tile.
  const cols = photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3';

  return (
    <section aria-labelledby={labelledBy ?? 'portfolio-heading'}>
      {!labelledBy && <h2 id="portfolio-heading" className="sr-only">Portfolio</h2>}
      <ul className={`grid gap-2 sm:gap-3 ${cols}`}>
        {photos.map((src, i) => {
          const featured = i === 0 && photos.length >= 3;
          return (
            <li key={src} className={featured ? 'col-span-2 row-span-2' : ''}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`Open photo ${i + 1} of ${photos.length}`}
                className="block h-full w-full overflow-hidden rounded-2xl ring-offset-2 ring-offset-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-pine">

                <img
                  src={src}
                  alt={`Work by ${vendorName}, photo ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className={`h-full w-full object-cover transition-transform duration-200 ease-out hover:scale-[1.03] ${
                  photos.length === 1 ? 'aspect-[16/10]' : 'aspect-square'}`
                  } />

              </button>
            </li>);

        })}
      </ul>
      <Lightbox
        photos={photos}
        index={open}
        onIndexChange={setOpen}
        onClose={() => setOpen(null)}
        altPrefix={`Work by ${vendorName}`} />

    </section>);

}
