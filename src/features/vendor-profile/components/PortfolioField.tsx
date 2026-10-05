import { useController, useFormContext } from 'react-hook-form';
import { PhotoPicker } from '../../../components/vendor/PhotoPicker';
import { errorText } from '../../../components/vendor/formStyles';
import { PORTFOLIO_MAX } from '../constants';
import { usePhotoListField } from '../../../hooks/usePhotoListField';
import type { ProfileFormData, ProfileFormValues } from '../types';

interface PortfolioFieldProps {
  vendorName: string;
  /** Photos already on the live profile; anything else is tagged "New". */
  saved: string[];
}

export function PortfolioField({ vendorName, saved }: PortfolioFieldProps) {
  const { control } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  const { field, fieldState } = useController({ control, name: 'gallery' });
  const photos = usePhotoListField(field.value, field.onChange, saved, PORTFOLIO_MAX);
  const errorId = 'profile-gallery-error';

  return (
    <>
      <PhotoPicker
        photos={field.value}
        problems={photos.problems}
        max={PORTFOLIO_MAX}
        isUnsaved={photos.isUnsaved}
        onAddFiles={photos.addFiles}
        onRemove={photos.remove}
        altPrefix={`Work by ${vendorName}`}
        invalid={Boolean(fieldState.error)}
        describedBy={fieldState.error ? errorId : undefined} />

      {fieldState.error && <p id={errorId} className={errorText}>{fieldState.error.message}</p>}
    </>);

}
