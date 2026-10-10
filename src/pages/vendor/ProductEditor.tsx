import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { ProductForm } from '../../components/vendor/ProductForm';
import { useVendors } from '../../contexts/VendorsContext';
import { PLAN_LIMIT } from '../../features/vendor-dashboard/constants';
import { UpgradePrompt } from '../../features/vendor-dashboard/components/subscription/UpgradePrompt';
import { usePlanLimits } from '../../features/vendor-dashboard/hooks/usePlanLimits';
import { NotFound } from '../NotFound';
import { useCurrentVendor } from '../../features/auth/hooks/useCurrentVendor';

const LIST = '/pro/catalogue/products';

/** Add (/pro/catalogue/products/new) or edit (/pro/catalogue/products/:productId) one product. */
export function ProductEditor() {
  const { t } = useTranslation('vendor');
  const { productId } = useParams();
  const navigate = useNavigate();
  const { getVendor, updateVendorProfile } = useVendors();
  const { vendorId } = useCurrentVendor();
  const vendor = getVendor(vendorId);
  const product = productId ? vendor?.products.find((p) => p.id === productId) : undefined;
  const limits = usePlanLimits();

  if (!vendor) return <NotFound message={t('profile.notFoundTitle')} />;
  if (productId && !product) return <NotFound message={t('products.notFound')} />;

  const done = (notice: string) => navigate(LIST, { state: { notice } });

  return (
    <>
      <PageHeader
        title={product ? t('products.editTitle') : t('products.add')}
        subtitle={product?.name ?? vendor?.name ?? ''}
        backTo={{ to: LIST, label: t('products.title') }} />

      <div className="mx-auto max-w-3xl px-5 py-6 lg:px-10 lg:py-8">
        {!product && limits.plan && limits.reached(PLAN_LIMIT.Products, vendor.products.length) ?
        <UpgradePrompt limitKey={PLAN_LIMIT.Products} plan={limits.plan} /> :

        <ProductForm
          key={product?.id ?? 'new'}
          initial={product}
          cancelTo={LIST}
          onSave={(input) => {
            if (product) {
              updateVendorProfile(vendor.id, { products: vendor.products.map((p) => p.id === product.id ? { ...p, ...input } : p) });
              done(t('products.savedNotice', { name: input.name }));
            } else {
              updateVendorProfile(vendor.id, { products: [{ ...input, id: `p${Date.now()}` }, ...vendor.products] });
              done(t('products.addedNotice', { name: input.name }));
            }
          }}
          onDelete={
          product ?
          () => {
            updateVendorProfile(vendor.id, { products: vendor.products.filter((p) => p.id !== product.id) });
            done(t('products.deleted', { name: product.name }));
          } :
          undefined
          } />
        }
      </div>
    </>);

}
