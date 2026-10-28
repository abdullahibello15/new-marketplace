import { Trans, useTranslation } from 'react-i18next';
import { TimerIcon } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';

/** "Expires in 29:41". Turns red in the last two minutes. The countdown itself isn't announced every second. */
export function ExpiryCountdown({ expiresAt, what }: {expiresAt: string;what: 'account' | 'code';}) {
  const { t } = useTranslation('payments');
  const { label, expired, remainingMs } = useCountdown(expiresAt);
  const urgent = remainingMs < 120_000;
  return (
    <p className={`flex items-center gap-1.5 text-sm font-bold ${urgent ? 'text-clay-dark' : 'text-ink'}`}>
      <TimerIcon className="h-4 w-4" aria-hidden="true" />
      {expired ?
      t(what === 'account' ? 'expiry.accountExpired' : 'expiry.codeExpired') :

      <Trans t={t} i18nKey={`expiry.${what}`} values={{ time: label }} components={{ time: <span className="font-mono tabular-nums" /> }} />
      }
    </p>);

}
