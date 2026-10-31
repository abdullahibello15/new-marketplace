import { useCurrentVendorData } from '../../vendor-profile/context/CurrentVendorContext';
import { useAuth as useContextAuth } from './useAuth';

/** The signed-in provider's vendor id and live profile (the vendor portal reads this, not a mock account). */
export function useCurrentVendor() {
  const { user, status } = useContextAuth();
  const data = useCurrentVendorData();
  const vendor = data.vendor;
  const vendorId = vendor?.id ?? user?.vendorId ?? '';
  return { ...data, vendorId, vendor, businessName: vendor?.name ?? 'Your business', authStatus: status };
}
