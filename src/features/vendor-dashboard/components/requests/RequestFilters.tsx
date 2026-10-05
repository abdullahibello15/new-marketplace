import { SearchInput } from '../../../../components/ui/SearchInput';
import { SegmentedControl, type SegmentOption } from '../../../../components/ui/SegmentedControl';
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
  // Statuses with no jobs are hidden to keep the row short (the selected one always stays).
  const options: SegmentOption<JobStatusFilter>[] = [
  { id: 'all', label: 'All', count: counts.all },
  ...JOB_STATUS_ORDER.filter((s) => counts[s] > 0 || s === status).map((s) => ({ id: s, label: JOB_STATUS_META[s].label, count: counts[s] }))];


  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={onQueryChange} label="Search by customer name" placeholder="Search by customer name…" />
      <SegmentedControl label="Filter by status" options={options} value={status} onChange={onStatusChange} />
    </div>);

}
