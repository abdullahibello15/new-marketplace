import { useTranslation } from 'react-i18next';
import { useId } from 'react';
import { SORT_OPTIONS } from '../../constants';
import type { SortOption } from '../../types';

interface SortSelectProps {
  value: SortOption;
  onChange: (next: SortOption) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  const id = useId();
  const { t } = useTranslation('discovery');
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="whitespace-nowrap text-sm font-semibold text-muted">
        {t('sort.label')}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(SORT_OPTIONS.find((o) => o.id === e.target.value)?.id ?? value)}
        className="rounded-lg border border-line bg-white px-2.5 py-2 text-sm font-semibold text-ink focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20">

        {SORT_OPTIONS.map((o) =>
        <option key={o.id} value={o.id}>
            {t(`sort.${o.id}`)}
          </option>
        )}
      </select>
    </div>);

}
