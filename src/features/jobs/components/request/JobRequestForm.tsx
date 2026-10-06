import { FormProvider } from 'react-hook-form';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import { useJobRequestForm } from '../../hooks/useJobRequestForm';
import { CancellationPolicySummary } from '../cancel/CancellationPolicySummary';
import { JobAddressFields } from './JobAddressFields';
import { JobDescriptionFields } from './JobDescriptionFields';
import { JobPhotosField } from './JobPhotosField';
import { JobRequestConfirmation } from './JobRequestConfirmation';
import { JobWhenFields } from './JobWhenFields';
import { RequestFormSection } from './RequestFormSection';
import type { Vendor } from '../../../../types/marketplace';

/** Task 50: description, photos, preferred date/time window and address → a Requested job. */
export function JobRequestForm({ vendor }: {vendor: Vendor;}) {
  const r = useJobRequestForm(vendor);
  const { isDirty, isSubmitting } = r.form.formState;
  const guard = useUnsavedChangesGuard(isDirty && !r.created);

  if (r.created) return <JobRequestConfirmation job={r.created} vendor={vendor} />;

  return (
    <FormProvider {...r.form}>
      <form onSubmit={r.submit} noValidate aria-label={`Request a job from ${vendor.name}`} className="space-y-5">
        <RequestFormSection id="job-what" title="What do you need?">
          <JobDescriptionFields services={vendor.services} />
        </RequestFormSection>

        <RequestFormSection id="job-photos-section" title="Photos" hint="Add 1 to 5 photos of the problem. Clear photos get you a more accurate quote.">
          <JobPhotosField
            photos={r.form.watch('photos')}
            problems={r.photos.problems}
            onAddFiles={r.photos.addFiles}
            onRemove={r.photos.remove}
            error={r.form.formState.errors.photos?.message} />
        </RequestFormSection>

        <RequestFormSection id="job-when" title="When">
          <JobWhenFields workingHours={vendor.workingHours} />
        </RequestFormSection>

        <RequestFormSection id="job-where" title="Where">
          <JobAddressFields
            places={r.places.data ?? []}
            placesStatus={r.places.status}
            onRetryPlaces={r.places.reload}
            locating={r.locating}
            onUseLocation={r.detectLocation} />

        </RequestFormSection>

        <CancellationPolicySummary />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">You’ll get a quote first. Nothing is booked or paid until you accept it.</p>
          <Button type="submit" variant="accent" loading={isSubmitting} className="sm:min-w-[12rem]">
            Send request
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={guard.isBlocked}
        title="Leave without sending?"
        description="Your job request hasn’t been sent. If you leave now, what you’ve entered will be lost."
        confirmLabel="Leave"
        cancelLabel="Keep editing"
        destructive
        onConfirm={guard.leave}
        onCancel={guard.stay} />

    </FormProvider>);

}
