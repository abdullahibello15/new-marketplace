import { useVendors } from '../../../contexts/VendorsContext';
import { useAuth } from './useAuth';

/** The signed-in provider's vendor id and live profile (the vendor portal reads this, not a mock account). */
export function useCurrentVendor() {
  const { user } = useAuth();
  const { getVendor } = useVendors();
  const vendorId = user?.vendorId ?? '';
  const vendor = vendorId ? getVendor(vendorId) : undefined;
  return { vendorId, vendor, businessName: vendor?.name ?? 'Your business' };
}
