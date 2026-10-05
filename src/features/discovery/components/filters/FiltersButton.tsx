import { SlidersHorizontalIcon } from 'lucide-react';
import { buttonClasses } from '../../../../components/ui/buttonStyles';

interface FiltersButtonProps {
  activeCount: number;
  expanded: boolean;
  onClick: () => void;
}

/** Opens the filter sheet on phones; shows how many filters are on. */
export function FiltersButton({ activeCount, expanded, onClick }: FiltersButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={activeCount ? `Filters, ${activeCount} active` : 'Filters'}
      className={buttonClasses({ variant: 'outline', size: 'sm' })}>

      <SlidersHorizontalIcon className="h-4 w-4" aria-hidden="true" />
      Filters
      {activeCount > 0 &&
      <span className="rounded-full bg-pine px-1.5 text-xs font-bold leading-5 text-white" aria-hidden="true">
          {activeCount}
        </span>
      }
    </button>);

}
