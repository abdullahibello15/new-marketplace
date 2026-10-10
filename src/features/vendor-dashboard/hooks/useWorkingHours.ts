import { makeWorkingHours } from '../../../data/weekdays';
import type { WorkingHours } from '../../../types/marketplace';
import { useCurrentVendor } from '../../auth/hooks/useCurrentVendor';

// Used only if the vendor profile is missing, so the calendar still renders (every day closed).
const NO_HOURS: WorkingHours = makeWorkingHours({});

/** The signed-in vendor's weekly hours, as edited on their profile. */
export function useWorkingHours(): WorkingHours {
  const { vendor } = useCurrentVendor();
  return vendor?.workingHours ?? NO_HOURS;
}
