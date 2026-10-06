import React, { useEffect, useId, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormField } from '../../../components/ui/FormField';
import { bad, errorText, field, ok } from '../../../components/vendor/formStyles';
import { REASON_MAX } from '../constants';
import { OTHER_REASON, makeReasonSchema, type ReasonFormData, type ReasonFormValues } from '../schemas';

interface ReasonDialogProps {
  open: boolean;
  title: string;
  description: string;
  reasonLabel: string;
  placeholder?: string;
  confirmLabel: string;
  /** Pick-list of reasons; "Other" with a text box is added automatically. Omit for free text only. */
  presets?: {id: string;label: string;}[];
  /** Make a reason mandatory (e.g. when the cancellation policy says so). */
  required?: boolean;
  /** Extra content above the reason, e.g. the cancellation terms and fee. */
  children?: React.ReactNode;
  /** Destructive actions (decline, reject, cancel) get the red button. */
  destructive?: boolean;
  /** Resolves true when the action succeeded (or moved to its next step), so the dialog can close. */
  onConfirm: (reason: string) => Promise<boolean>;
  onCancel: () => void;
}

const BLANK: ReasonFormValues = { preset: '', reason: '' };

/**
 * Asks for a reason before declining a request, rejecting a quote or cancelling a job. Free text by
 * default; with `presets`, a choice from a list plus "Other". Focus starts in the first field; the
 * destructive action is never the default.
 */
export function ReasonDialog({
  open,
  title,
  description,
  reasonLabel,
  placeholder,
  confirmLabel,
  presets,
  required = false,
  children,
  destructive = true,
  onConfirm,
  onCancel
}: ReasonDialogProps) {
  const id = useId();
  const presetIds = useMemo(() => presets?.map((p) => p.id) ?? [], [presets]);
  const schema = useMemo(() => makeReasonSchema({ required, presetIds }), [required, presetIds]);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<ReasonFormValues, unknown, ReasonFormData>({ resolver: zodResolver(schema), defaultValues: BLANK });
  const [preset, text] = useWatch({ control, name: ['preset', 'reason'] });
  const length = text.trim().length;
  const usingPresets = presetIds.length > 0;
  const showText = !usingPresets || preset === OTHER_REASON;

  useEffect(() => {
    if (open) reset(BLANK);
  }, [open, reset]);

  const textField =
  <FormField
    id={`${id}-text`}
    label={usingPresets ? 'Tell us more' : `${reasonLabel}${required ? '' : ' (optional)'}`}
    error={errors.reason?.message}
    aside={
    <span className={`text-xs font-semibold tabular-nums ${length > REASON_MAX ? 'text-clay-dark' : 'text-muted'}`}>
          {length}/{REASON_MAX}
        </span>
    }>

      {(describedBy) =>
    <textarea
      id={`${id}-text`}
      rows={3}
      {...register('reason')}
      placeholder={placeholder}
      aria-invalid={Boolean(errors.reason)}
      aria-required={required || usingPresets || undefined}
      aria-describedby={describedBy}
      className={`${field} resize-y ${errors.reason ? bad : ok}`} />

    }
    </FormField>;


  return (
    <Dialog open={open} onClose={onCancel} dismissible={!isSubmitting} title={title} description={description}>
      <form
        onSubmit={handleSubmit(async (data) => {
          const chosen = presets?.find((p) => p.id === data.preset);
          const reason = chosen ? data.reason ? `${chosen.label}. ${data.reason}` : chosen.label : data.reason;
          if (await onConfirm(reason)) onCancel();
        })}
        noValidate
        className="space-y-4">

        {children}

        {usingPresets &&
        <fieldset aria-describedby={errors.preset ? `${id}-preset-error` : undefined}>
            <legend className="mb-2 text-sm font-bold text-muted">
              {reasonLabel}
              {!required && ' (optional)'}
            </legend>
            <div className="space-y-2">
              {[...(presets ?? []), { id: OTHER_REASON, label: 'Other' }].map((p) =>
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-[15px] font-semibold text-ink has-[:checked]:border-pine has-[:checked]:bg-[#E3EEEC] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine/40">

                  <input type="radio" value={p.id} {...register('preset')} className="h-4 w-4 accent-pine" />
                  {p.label}
                </label>
            )}
            </div>
            {errors.preset &&
          <p id={`${id}-preset-error`} className={errorText}>
                {errors.preset.message}
              </p>
          }
          </fieldset>
        }

        {showText && textField}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Back
          </Button>
          <Button type="submit" variant={destructive ? 'danger' : 'primary'} loading={isSubmitting}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>);

}
