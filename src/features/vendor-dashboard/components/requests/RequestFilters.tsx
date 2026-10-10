import { useTranslation } from 'react-i18next';
import { SearchInput } from '../../../../components/ui/SearchInput';
import { SegmentedControl, type SegmentOption } from '../../../../components/ui/SegmentedControl';
import { jobStatusLabel } from '../../../../i18n/labels';
import { JOB_STATUS_META, JOB_STATUS_ORDER } from '../../../jobs/constants';
import type { JobStatusFilter } from '../../../jobs/types';

interface RequestFiltersProps {
  query: string;
  onQueryChange: (next: string) => void;
  status: JobStatusFilter;
  onStatusChange: (next: JobStatusFilter) => void;
  counts: Record<JobStatusFilter, number>;
}

export function RequestFilters({ query, onQueryChange, status, onStatusChange, counts }: RequestFiltersProps) {
  const { t } = useTranslation();
  // Statuses with no jobs are hidden to keep the row short (the selected one always stays).
  const options: SegmentOption<JobStatusFilter>[] = [
  { id: 'all', label: t('jobs:filter.all'), count: counts.all },
  ...JOB_STATUS_ORDER.filter((s) => counts[s] > 0 || s === status).map((s) => ({ id: s, label: jobStatusLabel(s, JOB_STATUS_META[s].label), count: counts[s] }))];


  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={onQueryChange} label={t('vendor:requests.search')} placeholder={t('vendor:requests.searchPlaceholder')} />
      <SegmentedControl label={t('vendor:requests.filterLabel')} options={options} value={status} onChange={onStatusChange} />
    </div>);

}
