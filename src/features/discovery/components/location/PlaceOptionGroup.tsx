import { CheckIcon } from 'lucide-react';
import type { Place } from '../../types';

interface PlaceOptionGroupProps {
  title: string;
  places: Place[];
  currentId: string;
  onChoose: (place: Place) => void;
}

export function PlaceOptionGroup({ title, places, currentId, onChoose }: PlaceOptionGroupProps) {
  if (places.length === 0) return null;
  const headingId = `place-group-${title.toLowerCase().replace(/\W+/g, '-')}`;

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="px-1 text-xs font-bold uppercase tracking-wider text-muted">
        {title}
      </h3>
      <ul className="mt-1.5 space-y-1">
        {places.map((p) => {
          const selected = p.id === currentId;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onChoose(p)}
                aria-current={selected ? 'true' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
                selected ? 'bg-[#E3EEEC]' : 'hover:bg-sand'}`}>

                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{p.name}</span>
                  <span className="block text-sm text-muted">{p.context}</span>
                </span>
                {selected &&
                <>
                    <CheckIcon className="h-4 w-4 shrink-0 text-pine" aria-hidden="true" />
                    <span className="sr-only">(selected)</span>
                  </>
                }
              </button>
            </li>);

        })}
      </ul>
    </section>);

}
