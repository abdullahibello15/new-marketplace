import { useController, useFormContext } from 'react-hook-form';
import { PhotoPicker } from '../../../components/vendor/PhotoPicker';
import { errorText } from '../../../components/vendor/formStyles';
import { PORTFOLIO_MAX } from '../constants';
import { usePhotoListField } from '../../../hooks/usePhotoListField';
import { PLAN_LIMIT } from '../../vendor-dashboard/constants';
import { UpgradePrompt } from '../../vendor-dashboard/components/subscription/UpgradePrompt';
import { usePlanLimits } from '../../vendor-dashboard/hooks/usePlanLimits';
import type { ProfileFormData, ProfileFormValues } from '../types';

interface PortfolioFieldProps {
  vendorName: string;
  /** Photos already on the live profile; anything else is tagged "New". */
  saved: string[];
}

export function PortfolioField({ vendorName, saved }: PortfolioFieldProps) {
  const { control } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  const { field, fieldState } = useController({ control, name: 'gallery' });
  // The plan's photo limit (plans.ts), never above the app's own maximum.
  const limits = usePlanLimits();
  const max = Math.min(PORTFOLIO_MAX, limits.limitOf(PLAN_LIMIT.PortfolioPhotos) ?? PORTFOLIO_MAX);
  const photos = usePhotoListField(field.value, field.onChange, saved, max);
  const errorId = 'profile-gallery-error';

  return (
    <>
      <PhotoPicker
        photos={field.value}
        problems={photos.problems}
        max={max}
        isUnsaved={photos.isUnsaved}
        onAddFiles={photos.addFiles}
        onRemove={photos.remove}
        altPrefix={`Work by ${vendorName}`}
        invalid={Boolean(fieldState.error)}
        describedBy={fieldState.error ? errorId : undefined} />

      {fieldState.error && <p id={errorId} className={errorText}>{fieldState.error.message}</p>}
      {limits.plan && limits.reached(PLAN_LIMIT.PortfolioPhotos, field.value.length) && max < PORTFOLIO_MAX &&
      <div className="mt-3">
          <UpgradePrompt limitKey={PLAN_LIMIT.PortfolioPhotos} plan={limits.plan} />
        </div>
      }
    </>);

}
