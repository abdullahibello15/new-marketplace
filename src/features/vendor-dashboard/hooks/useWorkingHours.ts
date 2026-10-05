import { useVendors } from '../../../contexts/VendorsContext';
import { vendorAccount } from '../../../data/vendorPortal';
import { makeWorkingHours } from '../../../data/weekdays';
import type { WorkingHours } from '../../../types/marketplace';

// Used only if the vendor profile is missing, so the calendar still renders (every day closed).
const NO_HOURS: WorkingHours = makeWorkingHours({});

/** The signed-in vendor's weekly hours, as edited on their profile. */
export function useWorkingHours(): WorkingHours {
  const { getVendor } = useVendors();
  return getVendor(vendorAccount.vendorId)?.workingHours ?? NO_HOURS;
}
