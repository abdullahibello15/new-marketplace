import { format } from 'date-fns';
import { RotateCwIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { PAYMENT_CONFIG } from '../config';

interface PollingStatusProps {
  polling: boolean;
  checking: boolean;
  lastCheckedAt: Date | null;
  gaveUp: boolean;
  onCheckNow: () => void;
}

/** "Checking every few seconds… last checked 10:42:05" plus the manual "Check again". */
export function PollingStatus({ polling, checking, lastCheckedAt, gaveUp, onCheckNow }: PollingStatusProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
      <p aria-live="polite" className="text-ink">
        {polling ?
        'Waiting for your payment. We check every few seconds.' :
        gaveUp ?
        `Still nothing after ${PAYMENT_CONFIG.pollMaxMinutes} minutes. Check again when you’ve paid.` :
        'Not checking automatically right now.'}
        {lastCheckedAt && <span className="block text-xs text-muted">Last checked {format(lastCheckedAt, 'h:mm:ss a')}</span>}
      </p>
      <Button variant="outline" size="sm" icon={RotateCwIcon} loading={checking} onClick={onCheckNow}>
        Check again
      </Button>
    </div>);

}
