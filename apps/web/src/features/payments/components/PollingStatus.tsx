import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../utils/format';
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
  const { t } = useTranslation('payments');
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
      <p aria-live="polite" className="text-ink">
        {polling ?
        t('polling.waiting') :
        gaveUp ?
        t('polling.gaveUp', { minutes: PAYMENT_CONFIG.pollMaxMinutes }) :
        t('polling.off')}
        {lastCheckedAt && <span className="block text-xs text-muted">{t('polling.last', { time: formatDate(lastCheckedAt, 'h:mm:ss a') })}</span>}
      </p>
      <Button variant="outline" size="sm" icon={RotateCwIcon} loading={checking} onClick={onCheckNow}>
        {t('polling.check')}
      </Button>
    </div>);

}
