import { SegmentedControl, type SegmentOption } from '../../../../components/ui/SegmentedControl';
import { JOB_STATUS_META, JOB_STATUS_ORDER } from '../../constants';
import type { JobStatus, JobStatusFilter as Filter } from '../../types';

interface JobStatusFilterProps {
  value: Filter;
  onChange: (next: Filter) => void;
  counts: Record<JobStatus, number>;
  total: number;
}

/** All, then each status that has jobs (plus the selected one, so it never vanishes). */
export function JobStatusFilter({ value, onChange, counts, total }: JobStatusFilterProps) {
  const options: SegmentOption<Filter>[] = [
  { id: 'all', label: 'All', count: total },
  ...JOB_STATUS_ORDER.filter((s) => counts[s] > 0 || s === value).map((s) => ({ id: s, label: JOB_STATUS_META[s].label, count: counts[s] }))];

  return <SegmentedControl label="Filter jobs by status" options={options} value={value} onChange={onChange} />;
}
