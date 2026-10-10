import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { Switch } from '../../../components/Switch';
import type { ProfileFormData, ProfileFormValues } from '../types';

/** Lets a vendor opt out of cash on completion. Online methods can't be turned off. */
export function PaymentsField() {
  const { t } = useTranslation('vendor');
  const { control } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  return (
    <Controller
      control={control}
      name="acceptsCash"
      render={({ field }) =>
      <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-ink">{t('profile.payments.cash')}</p>
            <p id="accepts-cash-hint" className="text-sm text-muted">
              {t('profile.payments.cashText')}
            </p>
          </div>
          <Switch checked={field.value} onChange={field.onChange} label={t('profile.payments.cash')} describedBy="accepts-cash-hint" />
        </div>
      } />);


}
