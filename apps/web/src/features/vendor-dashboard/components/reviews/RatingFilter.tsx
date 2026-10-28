import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const options: SegmentOption<string>[] = [
  { id: 'all', label: t('jobs:filter.all'), count: stats.total },
  ...STAR_LEVELS.map((level) => ({
    id: toId(level),
    label: `${level}★`,
    ariaLabel: t('stars.count', { count: level }),
    count: stats.counts[level]
  }))];


  return <SegmentedControl label={t('vendor:reviews.filter')} options={options} value={toId(value)} onChange={(id) => onChange(fromId(id))} />;
}
