import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { VendorCard } from '../../components/VendorCard';
import { ProfileForm, type ProfileDraft } from '../../components/vendor/ProfileForm';
import { PortfolioEditor } from '../../components/vendor/PortfolioEditor';
import { WorkingHoursEditor } from '../../components/vendor/WorkingHoursEditor';
import { ServiceAreasEditor } from '../../components/vendor/ServiceAreasEditor';
import { useVendors } from '../../contexts/VendorsContext';
import { vendorAccount } from '../../data/vendorPortal';
import { NotFound } from '../NotFound';

export function EditProfile() {
  const { getVendor, updateVendorProfile } = useVendors();
  const vendor = getVendor(vendorAccount.vendorId);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);

  if (!vendor) return <NotFound message="We couldn't find your vendor profile." />;

  const preview = draft ?
  {
    ...vendor,
    tradeCategory: draft.tradeCategory || vendor.tradeCategory,
    tradeCategoryOther: draft.tradeCategoryOther
  } :
  vendor;

  return (
    <>
      <PageHeader
        title="Edit profile"
        subtitle={vendorAccount.businessName}
        backTo={{ to: '/pro/catalogue', label: 'My services' }} />

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:px-10 lg:py-8">
        <div className="space-y-6">
          <ProfileForm
            initial={vendor}
            onChange={setDraft}
            onSave={(input) => updateVendorProfile(vendor.id, input)} />


          <PortfolioEditor
            saved={vendor.gallery}
            vendorName={vendor.name}
            onSave={(gallery) => updateVendorProfile(vendor.id, { gallery })} />


          <Link
            to="/pro/catalogue"
            className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-[border-color,transform] duration-150 ease-out hover:border-pine/40 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 lg:p-5">

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-ink">Services & prices</h2>
              <p className="mt-0.5 text-sm text-muted">
                {vendor.services.length} {vendor.services.length === 1 ? 'service' : 'services'} listed. Add, edit or remove them in
                My services.
              </p>
            </div>
            <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
          </Link>

          <WorkingHoursEditor
            saved={vendor.workingHours}
            onSave={(workingHours) => updateVendorProfile(vendor.id, { workingHours })} />


          <ServiceAreasEditor
            saved={vendor.serviceAreas}
            onSave={(serviceAreas) => updateVendorProfile(vendor.id, { serviceAreas })} />

        </div>

        <aside className="space-y-3 lg:sticky lg:top-8 lg:self-start" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="text-xs font-bold uppercase tracking-wider text-muted">How customers see you</h2>
          <VendorCard vendor={preview} />
          <Link
            to={`/vendor/${vendor.id}`}
            className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

            View public profile
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </>);

}
