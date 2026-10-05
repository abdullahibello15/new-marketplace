import { useEffect, useId } from 'react';
import { useForm, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { FormField } from '../../../../components/ui/FormField';
import { bad, errorText, field, ok } from '../../../../components/vendor/formStyles';
import { REPORT_DETAILS_MAX, REPORT_REASON, REPORT_REASON_LABELS } from '../../constants';
import { reportReviewSchema, type ReportReviewData, type ReportReviewFormValues } from '../../schemas';
import type { ReportReason, ReportReviewInput, Review } from '../../types';

interface ReportReviewDialogProps {
  review: Review | null;
  /** Resolves true when the report was saved. */
  onSubmit: (input: ReportReviewInput) => Promise<boolean>;
  onClose: () => void;
}

const REASONS = Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][];

// No reason pre-selected, so the vendor has to choose one.
const BLANK: DefaultValues<ReportReviewFormValues> = { details: '' };

export function ReportReviewDialog({ review, onSubmit, onClose }: ReportReviewDialogProps) {
  const uid = useId();
  const detailsId = `${uid}-details`;
  const reasonErrorId = `${uid}-reason-error`;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ReportReviewFormValues, unknown, ReportReviewData>({
    resolver: zodResolver(reportReviewSchema),
    defaultValues: BLANK
  });

  // Each report starts blank. The dialog stays mounted so the browser can return focus on close.
  const reviewId = review?.id;
  useEffect(() => {
    if (reviewId) reset(BLANK);
  }, [reviewId, reset]);

  const needsDetails = watch('reason') === REPORT_REASON.Other;

  return (
    <Dialog
      open={review !== null}
      onClose={onClose}
      dismissible={!isSubmitting}
      title="Report this review?"
      description={
      review &&
      <>
            Our team checks reported reviews and removes ones that break the rules. {review.customerName}’s review stays visible
            until then.
          </>

      }>

      <form
        onSubmit={handleSubmit(async (data) => {
          await onSubmit(data);
        })}
        noValidate
        className="space-y-4">

        <fieldset aria-describedby={errors.reason ? reasonErrorId : undefined}>
          <legend className="mb-2 text-sm font-bold text-muted">What’s wrong with it?</legend>
          <div className="space-y-2">
            {REASONS.map(([value, label]) =>
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-[15px] font-semibold text-ink has-[:checked]:border-pine has-[:checked]:bg-[#E3EEEC] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine/40">

                <input type="radio" value={value} {...register('reason')} className="h-4 w-4 accent-pine" />
                {label}
              </label>
            )}
          </div>
          {errors.reason && <p id={reasonErrorId} className={errorText}>{errors.reason.message}</p>}
        </fieldset>

        <FormField
          id={detailsId}
          label={needsDetails ? 'Details' : 'Details (optional)'}
          error={errors.details?.message}>

          {(describedBy) =>
          <textarea
            id={detailsId}
            rows={3}
            maxLength={REPORT_DETAILS_MAX * 2}
            {...register('details')}
            aria-invalid={Boolean(errors.details)}
            aria-describedby={describedBy}
            className={`${field} resize-y ${errors.details ? bad : ok}`} />

          }
        </FormField>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Report review
          </Button>
        </div>
      </form>
    </Dialog>);

}
