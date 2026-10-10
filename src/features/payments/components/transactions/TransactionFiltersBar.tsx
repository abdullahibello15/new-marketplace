import { useTranslation } from 'react-i18next';
import { paymentMethodLabel, transactionStatusLabel, transactionTypeLabel } from '../../../../i18n/labels';
import { Button } from '../../../../components/ui/Button';
import { SearchInput } from '../../../../components/ui/SearchInput';
import { SegmentedControl } from '../../../../components/ui/SegmentedControl';
import { bad, errorText, field, label as labelClass, ok } from '../../../../components/vendor/formStyles';
import { PAYMENT_METHOD_META, PAYMENT_METHOD_ORDER, TRANSACTION_STATUS, TRANSACTION_STATUS_META, TRANSACTION_TYPE, TRANSACTION_TYPE_LABELS } from '../../constants';
import type { TransactionFilters, TransactionSort, TransactionStatus, TransactionType } from '../../types';
import type { PaymentMethod } from '../../types';

interface TransactionFiltersBarProps {
  filters: TransactionFilters;
  onChange: <K extends keyof TransactionFilters,>(key: K, value: TransactionFilters[K]) => void;
  onReset: () => void;
  filtered: boolean;
  rangeError: string | null;
}



const select = `${field} ${ok} py-2.5`;

/** Search, type, status, method, date range and sort for the transaction list. */
export function TransactionFiltersBar({ filters: f, onChange, onReset, filtered, rangeError }: TransactionFiltersBarProps) {
  const { t } = useTranslation('payments');
  const typeOptions = [
  { id: 'all' as const, label: t('tx.all') },
  ...Object.values(TRANSACTION_TYPE).map((type) => ({ id: type, label: transactionTypeLabel(type, TRANSACTION_TYPE_LABELS[type]) }))];

  return (
    <section aria-label={t('tx.filters')} className="space-y-3">
      <SearchInput value={f.query} onChange={(v) => onChange('query', v)} label={t('tx.search')} />
      <SegmentedControl<TransactionType | 'all'> label={t('tx.type')} options={typeOptions} value={f.type} onChange={(v) => onChange('type', v)} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="tx-status" className={labelClass}>{t('tx.status')}</label>
          <select id="tx-status" value={f.status} onChange={(e) => onChange('status', e.target.value as TransactionStatus | 'all')} className={select}>
            <option value="all">{t('tx.allStatuses')}</option>
            {Object.values(TRANSACTION_STATUS).map((s) =>
            <option key={s} value={s}>{transactionStatusLabel(s, TRANSACTION_STATUS_META[s].label)}</option>
            )}
          </select>
        </div>
        <div>
          <label htmlFor="tx-method" className={labelClass}>{t('tx.method')}</label>
          <select id="tx-method" value={f.method} onChange={(e) => onChange('method', e.target.value as PaymentMethod | 'all')} className={select}>
            <option value="all">{t('tx.allMethods')}</option>
            {PAYMENT_METHOD_ORDER.map((m) =>
            <option key={m} value={m}>{paymentMethodLabel(m, PAYMENT_METHOD_META[m].label)}</option>
            )}
          </select>
        </div>
        <div>
          <label htmlFor="tx-from" className={labelClass}>{t('tx.from')}</label>
          <input id="tx-from" type="date" value={f.from} max={f.to || undefined} onChange={(e) => onChange('from', e.target.value)} className={select} />
        </div>
        <div>
          <label htmlFor="tx-to" className={labelClass}>{t('tx.to')}</label>
          <input
            id="tx-to"
            type="date"
            value={f.to}
            min={f.from || undefined}
            onChange={(e) => onChange('to', e.target.value)}
            aria-invalid={rangeError ? true : undefined}
            aria-describedby={rangeError ? 'tx-range-error' : undefined}
            className={`${field} ${rangeError ? bad : ok} py-2.5`} />

        </div>
        <div>
          <label htmlFor="tx-sort" className={labelClass}>{t('tx.sort')}</label>
          <select id="tx-sort" value={f.sort} onChange={(e) => onChange('sort', e.target.value as TransactionSort)} className={select}>
            <option value="newest">{t('tx.newest')}</option>
            <option value="oldest">{t('tx.oldest')}</option>
          </select>
        </div>
      </div>
      {rangeError && <p id="tx-range-error" className={errorText}>{rangeError}</p>}
      {filtered &&
      <Button variant="secondary" size="sm" onClick={onReset}>
          {t('tx.clear')}
        </Button>
      }
    </section>);

}
