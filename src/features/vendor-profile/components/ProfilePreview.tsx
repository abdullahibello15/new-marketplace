import { Link } from 'react-router-dom';
import { useFormContext, useWatch } from 'react-hook-form';
import { ArrowRightIcon } from 'lucide-react';
import { VendorCard } from '../../../components/VendorCard';
import { isTradeCategory } from '../schemas';
import type { Vendor } from '../../../types/marketplace';
import type { ProfileFormData, ProfileFormValues } from '../types';

/** Live card preview of how customers see the vendor in search, updated as they type. */
export function ProfilePreview({ vendor }: {vendor: Vendor;}) {
  const { control } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  const [name, tradeCategory, tradeCategoryOther] = useWatch({ control, name: ['name', 'tradeCategory', 'tradeCategoryOther'] });

  const preview: Vendor = {
    ...vendor,
    name: name.trim() || vendor.name,
    tradeCategory: isTradeCategory(tradeCategory) ? tradeCategory : vendor.tradeCategory,
    tradeCategoryOther
  };

  return (
    <aside className="space-y-3 lg:sticky lg:top-8 lg:self-start" aria-labelledby="profile-preview-heading">
      <h2 id="profile-preview-heading" className="text-xs font-bold uppercase tracking-wider text-muted">
        How customers see you
      </h2>
      <VendorCard vendor={preview} />
      <Link
        to={`/vendor/${vendor.id}`}
        className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

        View public profile
        <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
      </Link>
    </aside>);

}
