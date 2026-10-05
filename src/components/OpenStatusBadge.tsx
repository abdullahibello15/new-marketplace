import { isOpenNow } from '../utils/workingHours';
import type { WorkingHours } from '../types/marketplace';

export function OpenStatusBadge({ hours }: {hours: WorkingHours;}) {
  const open = isOpenNow(hours);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold ${
      open ? 'bg-[#E3EEEC] text-pine' : 'bg-clay-soft text-clay-dark'}`
      }>

      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-pine' : 'bg-clay-dark'}`} />
      {open ? 'Open now' : 'Closed'}
    </span>);

}
