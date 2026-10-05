import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../../components/ui/Button';
import { FormField } from '../../../../components/ui/FormField';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
import { REVIEW_REPLY_MAX } from '../../constants';
import { reviewReplySchema, type ReviewReplyData, type ReviewReplyFormValues } from '../../schemas';

interface ReviewReplyFormProps {
  customerName: string;
  /** Resolves true when the reply was saved. */
  onSubmit: (body: string) => Promise<boolean>;
  onCancel: () => void;
}

export function ReviewReplyForm({ customerName, onSubmit, onCancel }: ReviewReplyFormProps) {
  const id = useId();
  const {
    register,
    handleSubmit,
    setFocus,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ReviewReplyFormValues, unknown, ReviewReplyData>({
    resolver: zodResolver(reviewReplySchema),
    defaultValues: { body: '' }
  });

  useEffect(() => setFocus('body'), [setFocus]);

  const length = watch('body').trim().length;
  const over = length > REVIEW_REPLY_MAX;

  return (
    <form
      onSubmit={handleSubmit(async ({ body }) => {
        await onSubmit(body);
      })}
      noValidate
      aria-label={`Reply to ${customerName}`}
      className="mt-4 space-y-3 border-t border-line pt-4">

      <FormField
        id={id}
        label="Your public reply"
        hint="Anyone who views your profile can read this. You can reply once."
        error={errors.body?.message}
        aside={
        <span className={`text-xs font-semibold tabular-nums ${over ? 'text-clay-dark' : 'text-muted'}`}>
            {length}/{REVIEW_REPLY_MAX}
          </span>
        }>

        {(describedBy) =>
        <textarea
          id={id}
          rows={3}
          {...register('body')}
          aria-invalid={Boolean(errors.body)}
          aria-describedby={describedBy}
          placeholder={`Thank ${customerName}, or explain what happened.`}
          className={`${field} resize-y ${errors.body ? bad : ok}`} />

        }
      </FormField>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Post reply
        </Button>
      </div>
    </form>);

}
