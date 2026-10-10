import { Trans, useTranslation } from 'react-i18next';
import { currentLanguage } from '../../../i18n';
import { lgaLabel, tradeLabel } from '../../../i18n/labels';
import { formatDate } from '../../../utils/format';
import { useCallback, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2Icon, LinkIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { formatLocalPhone } from '../../../utils/phone';
import { AUTH_ROUTES, ROLE, ROLE_META } from '../../auth/constants';
import { errorMessage } from '../../auth/errors';
import { useAuth } from '../../auth/hooks/useAuth';
import { registerUser } from '../../auth/services/authService';
import { claimInvitedProfile } from '../../auth/services/accountService';
import { PhoneOtpForm } from '../../auth/components/PhoneOtpForm';
import { getClaim } from '../services/claimService';
import type { VerifyOtpResult } from '../../auth/types';

const input = `${field} ${ok}`;

/**
 * /claim/:token — a vendor whose trade association added them (bulk import) claims the "Invited" draft
 * profile: the link pre-fills their phone, they verify it with a one-time code, check their details and
 * accept the provider terms. The profile then becomes theirs and shows in search. Uses the same OTP flow
 * as sign-in and signup.
 */
export function ClaimProfileSection() {
  const { t } = useTranslation('auth');
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const load = useCallback(() => getClaim(token), [token]);
  const { data, status, error, reload } = useAsyncData(load);
  const [verified, setVerified] = useState<VerifyOtpResult | null>(null);
  const [details, setDetails] = useState<{businessName: string;town: string;years: string;bio: string;} | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function body() {
    if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (!data) return <LoadingState label={t('claim.loading')} />;
    if (data.status === 'claimed') return <EmptyState icon={CheckCircle2Icon} title={t('claim.alreadyTitle')} description={t('claim.alreadyBody')} action={<Link to={AUTH_ROUTES.login} className="font-bold text-pine underline">{t('claim.signIn')}</Link>} />;
    if (data.status === 'revoked') return <EmptyState icon={LinkIcon} title={t('claim.cancelledTitle')} description={t('claim.cancelledBody')} />;
    if (data.expired) return <EmptyState icon={LinkIcon} title={t('claim.expiredTitle')} description={t('claim.expiredBody')} />;

    const p = data.profile;
    const signedInAsInvitee = !!user && user.phone === p.phone;
    if (user && !signedInAsInvitee) {
      return (
        <div className="mx-auto max-w-md space-y-3 text-center">
          <p><Trans t={t} i18nKey="claim.wrongAccount" values={{ phone: formatLocalPhone(p.phone), name: user.name }} components={{ strong: <strong /> }} /></p>
          <Button variant="secondary" onClick={() => void signOut()}>{t('claim.signOutContinue')}</Button>
        </div>);

    }
    const ready = signedInAsInvitee || !!verified;

    const intro =
    <p className="rounded-2xl bg-[#E3EEEC] px-4 py-3 text-sm">
        <Trans t={t} i18nKey="claim.intro" values={{ association: data.associationName, business: p.businessName, date: formatDate(data.expiresAt, 'd MMM yyyy') }} components={{ strong: <strong /> }} />
      </p>;


    if (!ready) {
      return (
        <div className="mx-auto max-w-md space-y-4">
          {intro}
          <h2 className="font-bold">{t('claim.stepVerify')}</h2>
          <PhoneOtpForm initialPhone={formatLocalPhone(p.phone)} lockPhone onVerified={setVerified} sendLabel={t('otp.sendToMe')} />
        </div>);

    }

    const d = details ?? { businessName: p.businessName, town: p.town, years: p.yearsExperience === null ? '' : String(p.yearsExperience), bio: p.bio };
    const set = (key: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDetails({ ...d, [key]: e.target.value });

    async function submit(e: FormEvent) {
      e.preventDefault();
      const years = d.years.trim() === '' ? null : Number(d.years);
      if (years !== null && (!Number.isInteger(years) || years < 0 || years > 70)) return setFormError(t('claim.yearsInvalid'));
      if (!accepted) return setFormError(t('claim.acceptTerms'));
      const claim = { token, businessName: d.businessName, town: d.town, bio: d.bio, yearsExperience: years, acceptedTerms: accepted };
      setSaving(true);
      setFormError(null);
      try {
        if (verified?.status === 'new_user') await registerUser({ signupToken: verified.signupToken, name: p.fullName, role: ROLE.Provider, email: p.email, language: currentLanguage(), claim });else
        await claimInvitedProfile(claim);
        navigate(ROLE_META.provider.home, { replace: true });
      } catch (err) {
        setFormError(errorMessage(err));
      } finally {
        setSaving(false);
      }
    }

    return (
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
        {intro}
        <p className="text-sm text-pine">{t('claim.phoneVerified', { phone: formatLocalPhone(p.phone) })}</p>
        <section aria-labelledby="details-heading" className="space-y-3 rounded-2xl border border-line bg-white p-4 lg:p-5">
          <h2 id="details-heading" className="font-bold">{t('claim.stepDetails')}</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div><dt className="text-muted">{t('claim.name')}</dt><dd className="font-semibold">{p.fullName}</dd></div>
            <div><dt className="text-muted">{t('claim.trade')}</dt><dd className="font-semibold">{tradeLabel(p.tradeCategory)}</dd></div>
            <div><dt className="text-muted">{t('claim.lga')}</dt><dd className="font-semibold">{lgaLabel(p.lga)}</dd></div>
          </dl>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cl-biz" className={labelClass}>{t('claim.businessName')}</label>
              <input id="cl-biz" required value={d.businessName} onChange={set('businessName')} className={input} />
            </div>
            <div>
              <label htmlFor="cl-town" className={labelClass}>{t('claim.town')}</label>
              <input id="cl-town" value={d.town} onChange={set('town')} className={input} />
            </div>
            <div>
              <label htmlFor="cl-years" className={labelClass}>{t('claim.years')}</label>
              <input id="cl-years" inputMode="numeric" value={d.years} onChange={set('years')} className={input} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cl-bio" className={labelClass}>{t('claim.bio')}</label>
              <textarea id="cl-bio" rows={3} maxLength={300} value={d.bio} onChange={set('bio')} className={input} />
            </div>
          </div>
        </section>
        <section aria-labelledby="terms-heading" className="space-y-2 rounded-2xl border border-line bg-white p-4 lg:p-5">
          <h2 id="terms-heading" className="font-bold">{t('claim.stepTerms')}</h2>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line text-pine focus:ring-pine/40" />
            <span>
              <Trans t={t} i18nKey="claim.termsLine" components={{ termsLink: <Link to={AUTH_ROUTES.providerTerms} target="_blank" className="font-semibold text-pine underline" /> }} />
            </span>
          </label>
        </section>
        {formError && <p role="alert" className="text-sm font-medium text-clay-dark">{formError}</p>}
        <Button type="submit" variant="accent" loading={saving}>{t('claim.submit')}</Button>
      </form>);

  }

  return (
    <>
      <PageHeader title={t('claim.title')} subtitle={data?.profile.businessName} />
      <PageContainer>{body()}</PageContainer>
    </>);

}
