import { XIcon } from 'lucide-react';
import type { ActiveFilterChip } from '../../types';

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onRemove: (chip: ActiveFilterChip) => void;
  onClearAll: () => void;
}

export function ActiveFilterChips({ chips, onRemove, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ul className="contents" aria-label="Active filters">
        {chips.map((chip) =>
        <li key={chip.key}>
            <button
            type="button"
            onClick={() => onRemove(chip)}
            aria-label={chip.removeLabel}
            className="inline-flex items-center gap-1 rounded-full bg-[#E3EEEC] py-1 pl-3 pr-2 text-sm font-semibold text-pine transition-colors duration-150 hover:bg-[#d3e4e1] focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

              {chip.label}
              <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        )}
      </ul>
      <button
        type="button"
        onClick={onClearAll}
        className="rounded px-1 text-sm font-semibold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

        Clear all
      </button>
    </div>);

}
