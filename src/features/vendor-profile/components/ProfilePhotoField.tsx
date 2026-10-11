import { useTranslation } from 'react-i18next';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { PhotoPicker } from '../../../components/vendor/PhotoPicker';
import { usePhotoListField } from '../../../hooks/usePhotoListField';
import type { ProfileFormData, ProfileFormValues } from '../types';

/** One profile photo, with the same picker and file rules as the portfolio. Blank means the placeholder shows. */
export function ProfilePhotoField({ saved }: {saved: string;}) {
  const { t } = useTranslation('vendor');
  const { control } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  const { field } = useController({ control, name: 'photo' });
  const name = useWatch({ control, name: 'name' });
  const list = field.value ? [field.value] : [];
  const photos = usePhotoListField(list, (next) => field.onChange(next[0] ?? ''), saved ? [saved] : [], 1);

  return (
    <div>
      <p className="text-sm font-bold text-ink">{t('profile.about.photo')}</p>
      <p className="mb-2 text-xs text-muted">{t('profile.about.photoHint')}</p>
      <PhotoPicker
        photos={list}
        problems={photos.problems}
        max={1}
        isUnsaved={photos.isUnsaved}
        onAddFiles={photos.addFiles}
        onRemove={photos.remove}
        altPrefix={t('profile.about.photoAlt', { name })} />

    </div>);

}
