import { format } from 'date-fns';
import { MapPinCheckIcon } from 'lucide-react';
import type { JobArrival } from '../../types';

/** "Vendor arrived at 10:42 · near Tunga, Minna". */
export function ArrivalNotice({ arrival, who }: {arrival: JobArrival;who: string;}) {
  return (
    <p role="status" className="flex items-start gap-2.5 rounded-2xl bg-[#EDE6F5] px-4 py-3 text-sm font-semibold text-[#5B3E8A]">
      <MapPinCheckIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        {who} arrived at {format(new Date(arrival.at), 'h:mm a')}
        {arrival.locationLabel && <span className="font-normal"> · {arrival.locationLabel}</span>}
      </span>
    </p>);

}
