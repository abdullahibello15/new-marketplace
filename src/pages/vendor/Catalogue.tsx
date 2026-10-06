import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PlusIcon, SquarePenIcon, Trash2Icon, WrenchIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { AddServiceForm } from '../../components/vendor/AddServiceForm';
import { CatalogueTabs } from '../../components/vendor/CatalogueTabs';
import { useVendors } from '../../contexts/VendorsContext';
import { vendorAccount } from '../../data/vendorPortal';
import { formatPriceRange } from '../../utils/format';
import { PLAN_LIMIT } from '../../features/vendor-dashboard/constants';
import { UpgradePrompt } from '../../features/vendor-dashboard/components/subscription/UpgradePrompt';
import { usePlanLimits } from '../../features/vendor-dashboard/hooks/usePlanLimits';
import type { NewServiceInput, ServiceItem } from '../../types/vendorPortal';

export function Catalogue() {
  const { getVendor, updateVendorProfile } = useVendors();
  const vendor = getVendor(vendorAccount.vendorId);
  const services = vendor?.services ?? [];
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const limits = usePlanLimits();
  const atLimit = limits.reached(PLAN_LIMIT.Services, services.length);

  function saveServices(next: ServiceItem[]) {
    if (vendor) updateVendorProfile(vendor.id, { services: next });
  }
  const addService = (input: NewServiceInput) => saveServices([...services, { ...input, id: `s${Date.now()}`, photo: null }]);
  const updateService = (id: string, input: NewServiceInput) =>
  saveServices(services.map((s) => s.id === id ? { ...s, ...input } : s));
  const removeService = (id: string) => saveServices(services.filter((s) => s.id !== id));

  return (
    <>
      <PageHeader
        title="My services"
        subtitle={`Profile ${vendorAccount.profileCompletion}% complete`}>
        <div className="max-w-sm">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/20"
            role="progressbar"
            aria-valuenow={vendorAccount.profileCompletion}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completion">
            
            <div className="h-full rounded-full bg-mustard" style={{ width: `${vendorAccount.profileCompletion}%` }} />
          </div>
          <p className="mt-2 text-xs font-medium text-white/80">{vendorAccount.profileHint}</p>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">
        <CatalogueTabs />
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="order-2 text-xs font-bold uppercase tracking-wider text-muted sm:order-1">
            {services.length} {services.length === 1 ? 'service' : 'services'} listed
          </h2>
          {!adding && !atLimit &&
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="order-1 flex items-center justify-center gap-2 rounded-xl bg-clay px-5 py-3.5 text-[15px] font-bold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-clay-dark active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:order-2 sm:py-3">
            
              <PlusIcon className="h-5 w-5" aria-hidden="true" />
              Add service
            </button>
          }
        </div>

        {atLimit && limits.plan &&
        <div className="mt-4">
            <UpgradePrompt limitKey={PLAN_LIMIT.Services} plan={limits.plan} />
          </div>
        }

        <AnimatePresence initial={false}>
          {adding && !atLimit &&
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="mt-4">
            
              <AddServiceForm
              onCancel={() => setAdding(false)}
              onSave={(input) => {
                addService(input);
                setAdding(false);
              }} />
            
            </motion.div>
          }
        </AnimatePresence>

        {services.length > 0 ?
        <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:gap-4">
            {services.map((s) =>
          editingId === s.id ?
          <li key={s.id} className="md:col-span-2">
                  <AddServiceForm
              initial={s}
              onCancel={() => setEditingId(null)}
              onSave={(input) => {
                updateService(s.id, input);
                setEditingId(null);
              }} />
            
                </li> :

          <li key={s.id} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
                {s.photo ?
            <img src={s.photo} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" /> :

            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-sand text-muted" aria-hidden="true">
                    <WrenchIcon className="h-6 w-6" />
                  </span>
            }
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-ink">{s.name}</h3>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatPriceRange(s.minPrice, s.maxPrice)} · {s.duration}
                  </p>
                  {s.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{s.description}</p>}
                  {!s.photo && <p className="mt-1 text-xs font-semibold text-clay-dark">Add a photo to stand out</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <button
                type="button"
                onClick={() => {
                  setEditingId(s.id);
                  setAdding(false);
                }}
                aria-label={`Edit ${s.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-sand hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
                
                    <SquarePenIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                type="button"
                onClick={() => removeService(s.id)}
                aria-label={`Remove ${s.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-clay-soft hover:text-clay-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">
                
                    <Trash2Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
          )}
          </ul> :

        !adding &&
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
              <p className="font-bold text-ink">No services yet</p>
              <p className="mt-1 text-sm text-muted">Customers can only request jobs you list here.</p>
            </div>

        }
      </div>
    </>);

}