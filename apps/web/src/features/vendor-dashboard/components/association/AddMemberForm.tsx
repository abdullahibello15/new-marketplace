import { useTranslation } from 'react-i18next';
import { UserPlusIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '../../../../components/ui/Button';
import { FormField } from '../../../../components/ui/FormField';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
import type { AddMemberFormData, AddMemberFormValues } from '../../schemas';

interface AddMemberFormProps {
  form: UseFormReturn<AddMemberFormValues, unknown, AddMemberFormData>;
  onSubmit: () => void;
  /** At the bundle's maximum size. */
  full: boolean;
}

/** Add a member by the phone number or email on their Gwani vendor account. */
export function AddMemberForm({ form, onSubmit, full }: AddMemberFormProps) {
  const { t } = useTranslation('vendor');
  const {
    register,
    formState: { errors, isSubmitting }
  } = form;
  return (
    <form onSubmit={onSubmit} noValidate aria-label={t('association.add')} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <FormField id="member-contact" label={t('association.add')} hint={t('association.addHint')} error={errors.contact?.message}>
          {(describedBy) =>
          <input
            id="member-contact"
            inputMode="email"
            autoComplete="off"
            placeholder={t('association.addPlaceholder')}
            disabled={full}
            {...register('contact')}
            aria-invalid={Boolean(errors.contact)}
            aria-describedby={describedBy}
            className={`${field} ${errors.contact ? bad : ok} disabled:opacity-60`} />

          }
        </FormField>
      </div>
      <Button type="submit" icon={UserPlusIcon} loading={isSubmitting} disabled={full} className="sm:mb-[30px]">
        {t('association.addButton')}
      </Button>
    </form>);

}
