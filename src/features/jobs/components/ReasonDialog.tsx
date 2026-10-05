import { useEffect, useId } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormField } from '../../../components/ui/FormField';
import { bad, field, ok } from '../../../components/vendor/formStyles';
import { REASON_MAX } from '../constants';
import { reasonSchema, type ReasonFormData, type ReasonFormValues } from '../schemas';

interface ReasonDialogProps {
  open: boolean;
  title: string;
  description: string;
  reasonLabel: string;
  placeholder?: string;
  confirmLabel: string;
  /** Resolves true when the action succeeded, so the dialog can close. */
  onConfirm: (reason: string) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * Confirmation with an optional reason: declining a request (vendor) or rejecting a quote (customer).
 * Focus starts in the reason box; the destructive action is never the default.
 */
export function ReasonDialog({ open, title, description, reasonLabel, placeholder, confirmLabel, onConfirm, onCancel }: ReasonDialogProps) {
  const id = useId();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<ReasonFormValues, unknown, ReasonFormData>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: '' } });
  const length = useWatch({ control, name: 'reason' }).trim().length;

  useEffect(() => {
    if (open) reset({ reason: '' });
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={onCancel} dismissible={!isSubmitting} title={title} description={description}>
      <form
        onSubmit={handleSubmit(async ({ reason }) => {
          if (await onConfirm(reason)) onCancel();
        })}
        noValidate
        className="space-y-4">

        <FormField
          id={id}
          label={`${reasonLabel} (optional)`}
          error={errors.reason?.message}
          aside={
          <span className={`text-xs font-semibold tabular-nums ${length > REASON_MAX ? 'text-clay-dark' : 'text-muted'}`}>
              {length}/{REASON_MAX}
            </span>
          }>

          {(describedBy) =>
          <textarea
            id={id}
            rows={3}
            {...register('reason')}
            placeholder={placeholder}
            aria-invalid={Boolean(errors.reason)}
            aria-describedby={describedBy}
            className={`${field} resize-y ${errors.reason ? bad : ok}`} />

          }
        </FormField>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={isSubmitting}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>);

}
