import { Trans, useTranslation } from 'react-i18next';
import { TriangleAlertIcon } from 'lucide-react';

/** The cash caveat. Shown wherever cash is chosen or confirmed. */
export function CashNote() {
  const { t } = useTranslation('payments');
  return (
    <p className="flex gap-2 rounded-xl bg-[#FBF3DC] px-3 py-2.5 text-sm text-ink">
      <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-mustard-dark" aria-hidden="true" />
      <span>
        <Trans t={t} i18nKey="cashNote" components={{ strong: <strong /> }} />
      </span>
    </p>);

}
