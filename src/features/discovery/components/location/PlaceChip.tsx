import { ChevronDownIcon, MapPinIcon } from 'lucide-react';
import { placeLabel } from '../../constants';
import { usePlace } from '../../hooks/usePlace';

/** Shows the selected area; tapping it opens the place picker. Styled for the dark page header. */
export function PlaceChip() {
  const { place, openPicker, isPickerOpen } = usePlace();
  const label = placeLabel(place);
  return (
    <button
      type="button"
      onClick={openPicker}
      aria-haspopup="dialog"
      aria-expanded={isPickerOpen}
      aria-label={`Location: ${label}. Change location`}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/10 py-1.5 pl-3 pr-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">

      <MapPinIcon className="h-4 w-4 shrink-0 text-mustard" aria-hidden="true" />
      <span className="truncate">{label}</span>
      <ChevronDownIcon className="h-4 w-4 shrink-0 text-white/80" aria-hidden="true" />
    </button>);

}
