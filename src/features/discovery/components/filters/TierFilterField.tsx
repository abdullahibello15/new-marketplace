import { useFormContext } from 'react-hook-form';
import { VerificationBadge } from '../../../../components/VerificationBadge';
import { verificationTiers } from '../../../../data/verificationTiers';
import { FilterSection } from './FilterSection';
import type { FilterFormData, FilterFormValues } from '../../schemas';

/** Checkbox per verification tier, with the same badge customers see on vendor cards. */
export function TierFilterField() {
  const { register } = useFormContext<FilterFormValues, unknown, FilterFormData>();
  return (
    <FilterSection title="Verification">
      <div className="space-y-1">
        {verificationTiers.map((tier) =>
        <label
          key={tier.id}
          className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-sand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine/40">

            <input type="checkbox" value={tier.id} {...register('tiers')} className="mt-1 h-4 w-4 shrink-0 accent-pine" />
            <span className="min-w-0">
              <VerificationBadge verification={tier.id} />
              <span className="mt-0.5 block text-sm text-muted">{tier.description}</span>
            </span>
          </label>
        )}
      </div>
    </FilterSection>);

}
