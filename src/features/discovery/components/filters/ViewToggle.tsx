import { SegmentedControl, type SegmentOption } from '../../../../components/ui/SegmentedControl';
import { RESULTS_VIEW } from '../../constants';
import type { ResultsView } from '../../types';

const OPTIONS: SegmentOption<ResultsView>[] = [
{ id: RESULTS_VIEW.List, label: 'List' },
{ id: RESULTS_VIEW.Map, label: 'Map' }];


export function ViewToggle({ value, onChange }: {value: ResultsView;onChange: (next: ResultsView) => void;}) {
  return <SegmentedControl label="Show results as" options={OPTIONS} value={value} onChange={onChange} />;
}
