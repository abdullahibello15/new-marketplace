import { Dialog } from '../../../../components/ui/Dialog';
import { usePlace } from '../../hooks/usePlace';
import { PlacePickerContent } from './PlacePickerContent';

export function PlaceSheet() {
  const { isPickerOpen, closePicker } = usePlace();
  return (
    <Dialog open={isPickerOpen} onClose={closePicker} title="Choose your area" description="We’ll show vendors near here first.">
      <PlacePickerContent />
    </Dialog>);

}
