import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { UserXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { useScrollToHash } from '../../../hooks/useScrollToHash';
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard';
import { PROFILE_SECTION } from '../constants';
import { AboutFields } from '../components/AboutFields';
import { FulfilmentField } from '../components/FulfilmentField';
import { PaymentsField } from '../components/PaymentsField';
import { PortfolioField } from '../components/PortfolioField';
import { ProfilePreview } from '../components/ProfilePreview';
import { ProfileSaveBar } from '../components/ProfileSaveBar';
import { ProfileSectionCard } from '../components/ProfileSectionCard';
import { ProfileSectionNav } from '../components/ProfileSectionNav';
import { ServiceAreasField } from '../components/ServiceAreasField';
import { ServicesField } from '../components/ServicesField';
import { WorkingHoursField } from '../components/WorkingHoursField';
import { useProfileEditor } from '../hooks/useProfileEditor';


export function EditProfileSection() {
  const { t } = useTranslation('vendor');
  const TITLE = t('profile.title');
  const editor = useProfileEditor();
  const guard = useUnsavedChangesGuard(editor.isDirty);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  useScrollToHash(Boolean(editor.vendor));

  if (!editor.vendor) {
    return (
      <>
        <PageHeader title={TITLE} />
        <PageContainer width="narrow">
          <EmptyState icon={UserXIcon} title={t('profile.notFoundTitle')} description={t('profile.notFoundText')} />
        </PageContainer>
      </>);

  }

  const { vendor, sectionsWithErrors: errs } = editor;

  return (
    <>
      <PageHeader title={TITLE} subtitle={t('profile.subtitle')} />
      <PageContainer>
        <FormProvider {...editor.form}>
          <form onSubmit={editor.save} noValidate aria-label={t('profile.title')} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
            <div className="min-w-0 space-y-6">
              <ProfileSectionNav withErrors={errs} />
              <ProfileSectionCard section={PROFILE_SECTION.About} hasError={errs.has(PROFILE_SECTION.About)}>
                <AboutFields />
              </ProfileSectionCard>
              <ProfileSectionCard section={PROFILE_SECTION.Portfolio} hasError={errs.has(PROFILE_SECTION.Portfolio)}>
                <PortfolioField vendorName={vendor.name} saved={vendor.gallery} />
              </ProfileSectionCard>
              <ProfileSectionCard section={PROFILE_SECTION.Services} hasError={errs.has(PROFILE_SECTION.Services)}>
                <ServicesField />
              </ProfileSectionCard>
              <ProfileSectionCard section={PROFILE_SECTION.Hours} hasError={errs.has(PROFILE_SECTION.Hours)}>
                <WorkingHoursField />
              </ProfileSectionCard>
              <ProfileSectionCard section={PROFILE_SECTION.Areas} hasError={errs.has(PROFILE_SECTION.Areas)}>
                <ServiceAreasField />
              </ProfileSectionCard>
              <ProfileSectionCard section={PROFILE_SECTION.Fulfilment} hasError={errs.has(PROFILE_SECTION.Fulfilment)}>
                <FulfilmentField />
              </ProfileSectionCard>
              <ProfileSectionCard section={PROFILE_SECTION.Payments} hasError={errs.has(PROFILE_SECTION.Payments)}>
                <PaymentsField />
              </ProfileSectionCard>
              <ProfileSaveBar isDirty={editor.isDirty} isSubmitting={editor.isSubmitting} onDiscard={() => setConfirmDiscard(true)} />
            </div>
            <ProfilePreview vendor={vendor} />
          </form>
        </FormProvider>
      </PageContainer>

      <ConfirmDialog
        open={guard.isBlocked}
        title={t('profile.leaveTitle')}
        description={t('profile.leaveText')}
        confirmLabel={t('profile.leaveConfirm')}
        cancelLabel={t('jobs:request.keepEditing')}
        destructive
        onConfirm={guard.leave}
        onCancel={guard.stay} />

      <ConfirmDialog
        open={confirmDiscard}
        title={t('profile.discardTitle')}
        description={t('profile.discardText')}
        confirmLabel={t('profile.discardConfirm')}
        cancelLabel={t('jobs:request.keepEditing')}
        destructive
        onConfirm={() => {
          editor.discard();
          setConfirmDiscard(false);
        }}
        onCancel={() => setConfirmDiscard(false)} />

    </>);

}
