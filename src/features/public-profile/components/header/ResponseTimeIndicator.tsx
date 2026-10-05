import { TimerIcon } from 'lucide-react';
import { responseTimeLabel } from '../../utils/profileText';

/** "Usually responds within 1 hour". Renders nothing when there's no response-time data yet. */
export function ResponseTimeIndicator({ minutes }: {minutes: number | null | undefined;}) {
  const label = responseTimeLabel(minutes);
  if (!label) return null;
  return (
    <p className="inline-flex items-center gap-1.5">
      <TimerIcon className="h-4 w-4 text-mustard" aria-hidden="true" />
      Usually responds {label}
    </p>);

}
