import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../../utils/format';
import { MapPinCheckIcon } from 'lucide-react';
import type { JobArrival } from '../../types';

/** "Vendor arrived at 10:42 · near Tunga, Minna". `who` is null on the vendor's own screen ("You arrived…"). */
export function ArrivalNotice({ arrival, who }: {arrival: JobArrival;who: string | null;}) {
  const { t } = useTranslation('jobs');
  return (
    <p role="status" className="flex items-start gap-2.5 rounded-2xl bg-[#EDE6F5] px-4 py-3 text-sm font-semibold text-[#5B3E8A]">
      <MapPinCheckIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        {who === null ? t('arrivalYou', { time: formatDate(arrival.at, 'h:mm a') }) : t('arrival', { name: who, time: formatDate(arrival.at, 'h:mm a') })}
        {arrival.locationLabel && <span className="font-normal"> · {arrival.locationLabel}</span>}
      </span>
    </p>);

}
