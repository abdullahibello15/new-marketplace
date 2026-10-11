import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../../components/ui/Button';
import { FormField } from '../../../../components/ui/FormField';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
import { currentLanguage } from '../../../../i18n';
import { errorMessage, isAuthError } from '../../errors';
import { customerSignupSchema, type CustomerSignupData, type CustomerSignupValues } from '../../schemas';
import { registerCustomer } from '../../services/authService';
import { PasswordInput } from '../PasswordInput';
import { AlreadyRegistered } from './AlreadyRegistered';

/**
 * Customer signup: full name, email, password. No phone number: they add one later, when it's needed
 * (SMS reminders, cash or delivery orders). Signs them in, then `onDone` moves on to verifying the email.
 */
export function CustomerSignupForm({ onDone, onBack }: {onDone: () => void;onBack: () => void;}) {
  const { t } = useTranslation('auth');
  const [duplicate, setDuplicate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CustomerSignupValues, unknown, CustomerSignupData>({
    resolver: zodResolver(customerSignupSchema),
    defaultValues: { name: '', email: '', password: '' }
  });
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = form;

  const submit = handleSubmit(async (data) => {
    setFormError(null);
    setDuplicate(false);
    try {
      await registerCustomer({ ...data, language: currentLanguage() });
      onDone();
    } catch (e) {
      if (isAuthError(e) && e.code === 'email_taken') {
        setError('email', { message: e.message });
        setDuplicate(true);
      } else if (isAuthError(e) && e.code === 'weak_password') setError('password', { message: e.message });else
      setFormError(errorMessage(e));
    }
  });

  return (
    <form noValidate onSubmit={submit} className="space-y-4" aria-labelledby="signup-heading">
      <h1 id="signup-heading" className="text-2xl font-extrabold">{t('signup.customer.title')}</h1>
      <p className="text-sm text-muted">{t('signup.customer.intro')}</p>

      <FormField id="su-name" label={t('signup.fields.name')} error={errors.name?.message}>
        {(describedBy) =>
        <input id="su-name" autoComplete="name" autoFocus {...register('name')} aria-invalid={!!errors.name || undefined} aria-describedby={describedBy} className={`${field} ${errors.name ? bad : ok}`} />
        }
      </FormField>
      <FormField id="su-email" label={t('signup.fields.email')} hint={t('signup.customer.emailHint')} error={errors.email?.message}>
        {(describedBy) =>
        <input id="su-email" type="email" inputMode="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email || undefined} aria-describedby={describedBy} className={`${field} ${errors.email ? bad : ok}`} />
        }
      </FormField>
      {duplicate && <AlreadyRegistered />}
      <Controller
        control={control}
        name="password"
        render={({ field: f }) => <PasswordInput value={f.value} onChange={f.onChange} label={t('signup.fields.password')} autoComplete="new-password" showStrength error={errors.password?.message} />} />

      {formError && <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{formError}</p>}
      <p className="text-xs text-muted">{t('signup.customer.phoneLater')}</p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack} disabled={isSubmitting}>{t('common:action.back')}</Button>
        <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>{isSubmitting ? t('signup.creating') : t('signup.createAccount')}</Button>
      </div>
    </form>);

}
