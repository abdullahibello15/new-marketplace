import { useEffect, useId } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { FormField } from '../../../../components/ui/FormField';
import { bad, errorText, field, ok } from '../../../../components/vendor/formStyles';
import { DISPUTE_DETAILS_MAX, DISPUTE_REASON_LABELS } from '../../constants';
import { reportProblemSchema, type ReportProblemFormData, type ReportProblemFormValues } from '../../schemas';
import type { DisputeReason } from '../../types';

interface ReportProblemDialogProps {
  open: boolean;
  vendorName: string;
  /** Resolves true when the report was saved. */
  onSubmit: (data: ReportProblemFormData) => Promise<boolean>;
  onClose: () => void;
}

const REASONS = Object.entries(DISPUTE_REASON_LABELS) as [DisputeReason, string][];

/** "Report a problem" instead of confirming: sets the job to Disputed and flags it for review. */
export function ReportProblemDialog({ open, vendorName, onSubmit, onClose }: ReportProblemDialogProps) {
  const uid = useId();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<ReportProblemFormValues, unknown, ReportProblemFormData>({ resolver: zodResolver(reportProblemSchema), defaultValues: { details: '' } });
  const length = useWatch({ control, name: 'details' }).trim().length;

  useEffect(() => {
    if (open) reset({ details: '' });
  }, [open, reset]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!isSubmitting}
      title="Report a problem"
      description={`This puts the job on hold instead of confirming it. Gwani’s team will look into it with you and ${vendorName}.`}>

      <form
        onSubmit={handleSubmit(async (data) => {
          if (await onSubmit(data)) onClose();
        })}
        noValidate
        className="space-y-4">

        <fieldset aria-describedby={errors.reason ? `${uid}-reason-error` : undefined}>
          <legend className="mb-2 text-sm font-bold text-muted">What went wrong?</legend>
          <div className="space-y-2">
            {REASONS.map(([value, label]) =>
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-[15px] font-semibold text-ink has-[:checked]:border-clay has-[:checked]:bg-clay-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay/40">

                <input type="radio" value={value} {...register('reason')} className="h-4 w-4 accent-clay" />
                {label}
              </label>
            )}
          </div>
          {errors.reason &&
          <p id={`${uid}-reason-error`} className={errorText}>
              {errors.reason.message}
            </p>
          }
        </fieldset>

        <FormField
          id={`${uid}-details`}
          label="What happened?"
          error={errors.details?.message}
          aside={<span className="text-xs font-semibold tabular-nums text-muted">{length}/{DISPUTE_DETAILS_MAX}</span>}>

          {(describedBy) =>
          <textarea
            id={`${uid}-details`}
            rows={4}
            {...register('details')}
            placeholder="e.g. The pipe still leaks when the tap is on."
            aria-invalid={Boolean(errors.details)}
            aria-describedby={describedBy}
            className={`${field} resize-y ${errors.details ? bad : ok}`} />

          }
        </FormField>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={isSubmitting}>
            Report problem
          </Button>
        </div>
      </form>
    </Dialog>);

}
