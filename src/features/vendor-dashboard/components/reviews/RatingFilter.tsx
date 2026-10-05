import { SegmentedControl, type SegmentOption } from '../../../../components/ui/SegmentedControl';
import { STAR_LEVELS } from '../../constants';
import type { RatingFilter as RatingFilterValue, ReviewStats } from '../../types';

interface RatingFilterProps {
  value: RatingFilterValue;
  onChange: (next: RatingFilterValue) => void;
  stats: ReviewStats;
}

// SegmentedControl works with string ids; star levels are numbers.
const toId = (v: RatingFilterValue) => String(v);
const fromId = (id: string): RatingFilterValue => id === 'all' ? 'all' : Number(id) as RatingFilterValue;

export function RatingFilter({ value, onChange, stats }: RatingFilterProps) {
  const options: SegmentOption<string>[] = [
  { id: 'all', label: 'All', count: stats.total },
  ...STAR_LEVELS.map((level) => ({
    id: toId(level),
    label: `${level}★`,
    ariaLabel: `${level} ${level === 1 ? 'star' : 'stars'}`,
    count: stats.counts[level]
  }))];


  return <SegmentedControl label="Filter by rating" options={options} value={toId(value)} onChange={(id) => onChange(fromId(id))} />;
}
