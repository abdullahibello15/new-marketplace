import { Controller, useFormContext } from 'react-hook-form';
import { Switch } from '../../../components/Switch';
import type { ProfileFormData, ProfileFormValues } from '../types';

/** Lets a vendor opt out of cash on completion. Online methods can't be turned off. */
export function PaymentsField() {
  const { control } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  return (
    <Controller
      control={control}
      name="acceptsCash"
      render={({ field }) =>
      <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-ink">Accept cash on completion</p>
            <p id="accepts-cash-hint" className="text-sm text-muted">
              Customers can pay you in cash after the job (or at pickup), and you both confirm the amount in the app. Cash isn’t covered by
              Gwani’s payment protection or refunds.
            </p>
          </div>
          <Switch checked={field.value} onChange={field.onChange} label="Accept cash on completion" describedBy="accepts-cash-hint" />
        </div>
      } />);


}
