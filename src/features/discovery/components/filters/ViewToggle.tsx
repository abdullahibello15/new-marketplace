import { useTranslation } from 'react-i18next';
import { SegmentedControl, type SegmentOption } from '../../../../components/ui/SegmentedControl';
import { RESULTS_VIEW } from '../../constants';
import type { ResultsView } from '../../types';

export function ViewToggle({ value, onChange }: {value: ResultsView;onChange: (next: ResultsView) => void;}) {
  const { t } = useTranslation('discovery');
  const options: SegmentOption<ResultsView>[] = [
  { id: RESULTS_VIEW.List, label: t('view.list') },
  { id: RESULTS_VIEW.Map, label: t('view.map') }];

  return <SegmentedControl label={t('view.label')} options={options} value={value} onChange={onChange} />;
}
