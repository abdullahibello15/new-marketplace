import { useTranslation } from 'react-i18next';
import { CheckCircle2Icon, CircleDotIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface ProfileSaveBarProps {
  isDirty: boolean;
  isSubmitting: boolean;
  onDiscard: () => void;
}

/** The form's single Save, pinned above the phone bottom bar so it's always reachable. */
export function ProfileSaveBar({ isDirty, isSubmitting, onDiscard }: ProfileSaveBarProps) {
  const { t } = useTranslation('vendor');
  return (
    <div className="sticky bottom-20 z-10 flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-lg sm:flex-row sm:items-center lg:bottom-4">
      <p role="status" className="flex flex-1 items-center gap-2 px-1 text-sm font-semibold">
        {isDirty ?
        <>
            <CircleDotIcon className="h-4 w-4 text-clay-dark" aria-hidden="true" />
            <span className="text-ink">{t('profile.unsaved')}</span>
          </> :

        <>
            <CheckCircle2Icon className="h-4 w-4 text-pine" aria-hidden="true" />
            <span className="text-muted">{t('profile.saved')}</span>
          </>
        }
      </p>
      <div className="grid grid-cols-2 gap-3 sm:flex">
        <Button variant="secondary" onClick={onDiscard} disabled={!isDirty || isSubmitting}>
          {t('profile.discard')}
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          {t('profile.save')}
        </Button>
      </div>
    </div>);

}
