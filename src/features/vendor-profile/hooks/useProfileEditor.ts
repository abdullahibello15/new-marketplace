import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useVendors } from '../../../contexts/VendorsContext';
import { vendorAccount } from '../../../data/vendorPortal';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { FIELD_SECTION, PROFILE_SECTIONS } from '../constants';
import { profileSchema } from '../schemas';
import { saveVendorProfile } from '../services/vendorProfileService';
import { toFormValues } from '../utils/profileForm';
import type { ProfileFormData, ProfileFormValues, ProfileSectionId } from '../types';

function sectionsOf(fieldNames: string[]): Set<ProfileSectionId> {
  return new Set(fieldNames.map((name) => FIELD_SECTION[name as keyof ProfileFormValues]).filter(Boolean));
}

/** One form for the whole profile: a single Save, dirty tracking for the unsaved-changes warning, and feedback. */
export function useProfileEditor() {
  const { getVendor, updateVendorProfile } = useVendors();
  const vendor = getVendor(vendorAccount.vendorId);
  const toast = useToast();

  const form = useForm<ProfileFormValues, unknown, ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: vendor ? toFormValues(vendor) : undefined
  });
  const { isDirty, isSubmitting, errors } = form.formState;

  const save = form.handleSubmit(
    async (data) => {
      if (!vendor) return;
      try {
        const stored = await saveVendorProfile(vendor.id, data);
        updateVendorProfile(vendor.id, stored);
        // The saved values become the new baseline, so the form is clean again.
        form.reset(toFormValues({ ...vendor, ...stored }));
        toast.success('Profile saved. Customers now see your changes.');
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    (invalid) => {
      const failed = sectionsOf(Object.keys(invalid));
      const first = PROFILE_SECTIONS.find((s) => failed.has(s.id));
      toast.error(`Some details need fixing${first ? ` in ${first.label}` : ''} before you can save.`);
    }
  );

  return {
    vendor,
    form,
    save,
    discard: () => form.reset(),
    isDirty,
    isSubmitting,
    sectionsWithErrors: sectionsOf(Object.keys(errors))
  };
}
