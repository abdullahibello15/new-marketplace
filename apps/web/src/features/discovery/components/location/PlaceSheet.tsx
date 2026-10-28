import { useTranslation } from 'react-i18next';
import { Dialog } from '../../../../components/ui/Dialog';
import { usePlace } from '../../hooks/usePlace';
import { PlacePickerContent } from './PlacePickerContent';

export function PlaceSheet() {
  const { isPickerOpen, closePicker } = usePlace();
  const { t } = useTranslation('discovery');
  return (
    <Dialog open={isPickerOpen} onClose={closePicker} title={t('place.sheetTitle')} description={t('place.sheetDescription')}>
      <PlacePickerContent />
    </Dialog>);

}
