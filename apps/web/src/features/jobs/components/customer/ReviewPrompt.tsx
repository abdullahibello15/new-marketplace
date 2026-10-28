import { useTranslation } from 'react-i18next';
import { useId } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../../components/ui/Button';
import { FormField } from '../../../../components/ui/FormField';
import { StarRatingInput } from '../../../../components/ui/StarRatingInput';
import { bad, errorText, field, ok } from '../../../../components/vendor/formStyles';
import { REVIEW_COMMENT_MAX } from '../../constants';
import { reviewSchema, type ReviewFormData, type ReviewFormValues } from '../../schemas';
import type { Job } from '../../types';

interface ReviewPromptProps {
  /** Anything with the vendor's name: a job, or a retail order. */
  job: Pick<Job, 'vendorName'>;
  busy: string | null;
  onSubmit: (data: ReviewFormData) => Promise<boolean>;
  onSkip: () => void;
}

/** After confirming: rate and review the vendor. Submitting or skipping closes the job (or finishes the order). */
export function ReviewPrompt({ job, busy, onSubmit, onSkip }: ReviewPromptProps) {
  const { t } = useTranslation('jobs');
  const uid = useId();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ReviewFormValues, unknown, ReviewFormData>({ resolver: zodResolver(reviewSchema), defaultValues: { comment: '' } });
  const length = useWatch({ control, name: 'comment' }).trim().length;

  return (
    <section aria-labelledby="review-prompt-heading" className="rounded-2xl border border-mustard bg-white p-4 lg:p-5">
      <h2 id="review-prompt-heading" className="text-base font-bold text-ink">{t('reviewPrompt.title', { name: job.vendorName })}</h2>
      <p className="mt-0.5 text-sm text-muted">{t('reviewPrompt.text')}</p>
      <form
        onSubmit={handleSubmit(async (data) => {
          await onSubmit(data);
        })}
        noValidate
        className="mt-4 space-y-4">

        <Controller
          control={control}
          name="rating"
          render={({ field: f }) =>
          <StarRatingInput
            label={t('reviewPrompt.rating')}
            value={typeof f.value === 'number' ? f.value : null}
            onChange={f.onChange}
            invalid={Boolean(errors.rating)}
            describedBy={errors.rating ? `${uid}-rating-error` : undefined} />

          } />

        {errors.rating &&
        <p id={`${uid}-rating-error`} className={`${errorText} -mt-2`}>
            {errors.rating.message}
          </p>
        }
        <FormField
          id={`${uid}-comment`}
          label={t('reviewPrompt.comment')}
          error={errors.comment?.message}
          aside={<span className="text-xs font-semibold tabular-nums text-muted">{length}/{REVIEW_COMMENT_MAX}</span>}>

          {(describedBy) =>
          <textarea
            id={`${uid}-comment`}
            rows={3}
            {...register('comment')}
            placeholder={t('reviewPrompt.placeholder')}
            aria-invalid={Boolean(errors.comment)}
            aria-describedby={describedBy}
            className={`${field} resize-y ${errors.comment ? bad : ok}`} />

          }
        </FormField>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onSkip} loading={busy === 'skip'} disabled={busy === 'review'}>
            {t('reviewPrompt.skip')}
          </Button>
          <Button type="submit" loading={busy === 'review'} disabled={busy === 'skip'}>
            {t('reviewPrompt.post')}
          </Button>
        </div>
      </form>
    </section>);

}
