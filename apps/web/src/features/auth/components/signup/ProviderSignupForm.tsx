import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../../components/ui/Button';
import { FormField } from '../../../../components/ui/FormField';
import { bad, errorText, field, ok } from '../../../../components/vendor/formStyles';
import { nigerLgas } from '../../../../data/nigerLgas';
import { currentLanguage } from '../../../../i18n';
import { lgaLabel } from '../../../../i18n/labels';
import { AUTH_ROUTES } from '../../constants';
import { errorMessage, isAuthError } from '../../errors';
import { providerSignupSchema, type ProviderSignupData, type ProviderSignupValues } from '../../schemas';
import { registerProvider } from '../../services/authService';
import { PasswordInput } from '../PasswordInput';
import { PhoneInput } from '../PhoneInput';
import { AlreadyRegistered } from './AlreadyRegistered';

/**
 * Provider signup: full name, phone, email, base location (LGA + town or landmark), password and the
 * provider terms. Signs them in, then `onDone` moves on to verifying the phone and the vendor setup
 * (business name, trade, service or retail). The location becomes the vendor profile's base location.
 */
export function ProviderSignupForm({ onDone, onBack }: {onDone: () => void;onBack: () => void;}) {
  const { t } = useTranslation('auth');
  const [duplicate, setDuplicate] = useState(false);
  const [claimPath, setClaimPath] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ProviderSignupValues, unknown, ProviderSignupData>({
    resolver: zodResolver(providerSignupSchema),
    defaultValues: { name: '', phone: '', email: '', lga: '', town: '', password: '', acceptedTerms: false }
  });
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = form;

  const submit = handleSubmit(async (data) => {
    setFormError(null);
    setDuplicate(false);
    setClaimPath(null);
    try {
      await registerProvider({ ...data, language: currentLanguage() });
      onDone();
    } catch (e) {
      if (isAuthError(e) && (e.code === 'email_taken' || e.code === 'phone_taken' || e.code === 'duplicate_vendor')) {
        setError(e.code === 'email_taken' ? 'email' : 'phone', { message: e.message });
        setDuplicate(true);
      } else if (isAuthError(e) && e.code === 'invite_exists') {
        setError('phone', { message: e.message });
        setClaimPath(e.claimPath);
      } else if (isAuthError(e) && e.code === 'weak_password') setError('password', { message: e.message });else
      setFormError(errorMessage(e));
    }
  });

  return (
    <form noValidate onSubmit={submit} className="space-y-4" aria-labelledby="signup-heading">
      <h1 id="signup-heading" className="text-2xl font-extrabold">{t('signup.provider.title')}</h1>
      <p className="text-sm text-muted">{t('signup.provider.intro')}</p>

      <FormField id="sp-name" label={t('signup.fields.name')} error={errors.name?.message}>
        {(describedBy) =>
        <input id="sp-name" autoComplete="name" autoFocus {...register('name')} aria-invalid={!!errors.name || undefined} aria-describedby={describedBy} className={`${field} ${errors.name ? bad : ok}`} />
        }
      </FormField>
      <Controller
        control={control}
        name="phone"
        render={({ field: f }) => <PhoneInput value={f.value} onChange={f.onChange} label={t('signup.fields.phone')} error={errors.phone?.message} />} />

      <FormField id="sp-email" label={t('signup.fields.email')} error={errors.email?.message}>
        {(describedBy) =>
        <input id="sp-email" type="email" inputMode="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email || undefined} aria-describedby={describedBy} className={`${field} ${errors.email ? bad : ok}`} />
        }
      </FormField>
      {duplicate && <AlreadyRegistered />}
      {claimPath &&
      <p className="rounded-xl bg-[#E3EEEC] px-4 py-3 text-sm">
          <Link to={claimPath} className="font-bold text-pine underline">{t('signup.claimNow')}</Link>
        </p>
      }

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-ink">{t('signup.provider.locationLegend')}</legend>
        <p className="text-xs text-muted">{t('signup.provider.locationHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="sp-lga" label={t('setup.lga')} error={errors.lga?.message}>
            {(describedBy) =>
            <select id="sp-lga" {...register('lga')} aria-invalid={!!errors.lga || undefined} aria-describedby={describedBy} className={`${field} ${errors.lga ? bad : ok}`}>
                <option value="" disabled>{t('setup.chooseLga')}</option>
                {nigerLgas.map((l) => <option key={l} value={l}>{lgaLabel(l)}</option>)}
              </select>
            }
          </FormField>
          <FormField id="sp-town" label={t('setup.town')} error={errors.town?.message}>
            {(describedBy) =>
            <input id="sp-town" autoComplete="address-level2" placeholder={t('setup.townPlaceholder')} {...register('town')} aria-invalid={!!errors.town || undefined} aria-describedby={describedBy} className={`${field} ${errors.town ? bad : ok}`} />
            }
          </FormField>
        </div>
      </fieldset>

      <Controller
        control={control}
        name="password"
        render={({ field: f }) => <PasswordInput value={f.value} onChange={f.onChange} label={t('signup.fields.password')} autoComplete="new-password" showStrength error={errors.password?.message} />} />

      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" {...register('acceptedTerms')} aria-invalid={!!errors.acceptedTerms || undefined} aria-describedby={errors.acceptedTerms ? 'sp-terms-error' : undefined} className="mt-0.5 h-4 w-4 rounded border-line text-pine focus:ring-pine/40" />
          <span>
            <Trans t={t} i18nKey="setup.terms" components={{ termsLink: <Link to={AUTH_ROUTES.providerTerms} target="_blank" className="font-semibold text-pine underline underline-offset-2" /> }} />
          </span>
        </label>
        {errors.acceptedTerms && <p id="sp-terms-error" className={errorText}>{errors.acceptedTerms.message}</p>}
      </div>

      {formError && <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{formError}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack} disabled={isSubmitting}>{t('common:action.back')}</Button>
        <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>{isSubmitting ? t('signup.creating') : t('signup.createAccount')}</Button>
      </div>
    </form>);

}
