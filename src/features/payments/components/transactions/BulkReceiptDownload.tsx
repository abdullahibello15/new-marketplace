import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { startOfMonth } from 'date-fns';
import { FilesIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { bad, errorText, field, label as labelClass, ok } from '../../../../components/vendor/formStyles';
import { toDateKey } from '../../../../lib/dates';

interface BulkReceiptDownloadProps {
  busy: boolean;
  onDownload: (from: string, to: string) => void;
}

/** "Download all receipts for a date range": one PDF, one receipt per page. Defaults to this month. */
export function BulkReceiptDownload({ busy, onDownload }: BulkReceiptDownloadProps) {
  const { t } = useTranslation('payments');
  const [from, setFrom] = useState(() => toDateKey(startOfMonth(new Date())));
  const [to, setTo] = useState(() => toDateKey(new Date()));
  const error = from && to && from > to ? t('tx.rangeError') : null;

  return (
    <details className="group rounded-2xl border border-line bg-white p-4">
      <summary className="flex cursor-pointer items-center gap-2 rounded font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
        <FilesIcon className="h-4 w-4 text-pine" aria-hidden="true" />
        {t('tx.bulkTitle')}
      </summary>
      <form
        className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!error) onDownload(from, to);
        }}>

        <div>
          <label htmlFor="bulk-from" className={labelClass}>{t('tx.from')}</label>
          <input id="bulk-from" type="date" required value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={`${field} ${ok} py-2.5`} />
        </div>
        <div>
          <label htmlFor="bulk-to" className={labelClass}>{t('tx.to')}</label>
          <input
            id="bulk-to"
            type="date"
            required
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'bulk-range-error' : undefined}
            className={`${field} ${error ? bad : ok} py-2.5`} />

        </div>
        <Button type="submit" loading={busy} disabled={error !== null}>
          {t('receipt.downloadPdf')}
        </Button>
      </form>
      {error && <p id="bulk-range-error" className={errorText}>{error}</p>}
      <p className="mt-2 text-xs text-muted">{t('tx.bulkNote')}</p>
    </details>);

}
