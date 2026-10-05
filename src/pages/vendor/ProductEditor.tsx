import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { ProductForm } from '../../components/vendor/ProductForm';
import { useVendors } from '../../contexts/VendorsContext';
import { vendorAccount } from '../../data/vendorPortal';
import { NotFound } from '../NotFound';

const LIST = '/pro/catalogue/products';

/** Add (/pro/catalogue/products/new) or edit (/pro/catalogue/products/:productId) one product. */
export function ProductEditor() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { getVendor, updateVendorProfile } = useVendors();
  const vendor = getVendor(vendorAccount.vendorId);
  const product = productId ? vendor?.products.find((p) => p.id === productId) : undefined;

  if (!vendor) return <NotFound message="We couldn't find your vendor profile." />;
  if (productId && !product) return <NotFound message="We couldn't find that product. It may have been deleted." />;

  const done = (notice: string) => navigate(LIST, { state: { notice } });

  return (
    <>
      <PageHeader
        title={product ? 'Edit product' : 'Add product'}
        subtitle={product?.name ?? vendorAccount.businessName}
        backTo={{ to: LIST, label: 'My products' }} />

      <div className="mx-auto max-w-3xl px-5 py-6 lg:px-10 lg:py-8">
        <ProductForm
          key={product?.id ?? 'new'}
          initial={product}
          cancelTo={LIST}
          onSave={(input) => {
            if (product) {
              updateVendorProfile(vendor.id, { products: vendor.products.map((p) => p.id === product.id ? { ...p, ...input } : p) });
              done(`Saved ${input.name}.`);
            } else {
              updateVendorProfile(vendor.id, { products: [{ ...input, id: `p${Date.now()}` }, ...vendor.products] });
              done(`Added ${input.name}.`);
            }
          }}
          onDelete={
          product ?
          () => {
            updateVendorProfile(vendor.id, { products: vendor.products.filter((p) => p.id !== product.id) });
            done(`Deleted ${product.name}.`);
          } :
          undefined
          } />

      </div>
    </>);

}
