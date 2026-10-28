import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Lightbox } from '../../../components/Lightbox';

/** Job photo thumbnails that open the shared lightbox (arrows, Escape, swipe). */
export function JobPhotos({ photos, label }: {photos: string[];label: string;}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return <p className="text-sm text-muted">{t('jobs:details.noPhotos')}</p>;
  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {photos.map((src, i) =>
        <li key={src}>
            <button
            type="button"
            onClick={() => setOpen(i)}
            aria-label={t('photos.open', { n: i + 1, total: photos.length })}
            className="block overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2">

              <img src={src} alt="" loading="lazy" className="h-20 w-20 object-cover lg:h-24 lg:w-24" />
            </button>
          </li>
        )}
      </ul>
      <Lightbox photos={photos} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} altPrefix={label} />
    </>);

}
