import { useCallback, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useAuth } from '../../auth/hooks/useAuth';
import { useCurrentVendor } from '../../auth/hooks/useCurrentVendor';
import { getMyProfileCompleteness } from '../services/profileCompletenessService';
import { calculateProfileCompleteness, completenessKindOf } from '../utils/completeness';
import type { MyProfileCompleteness, ProfileCompleteness, ProfileFormData, ProfileFormValues } from '../types';

/**
 * The signed-in vendor's completeness score, from the service. It reloads whenever the saved profile or
 * the account changes (both come from live stores), so the score updates as soon as the vendor saves.
 */
export function useProfileCompleteness() {
  const { vendorId, vendor } = useCurrentVendor();
  const { user } = useAuth();
  // `vendor` and `user` are only dependencies: a new object means saved data changed, so fetch again.
  const load = useCallback(() => getMyProfileCompleteness(vendorId), [vendorId, vendor, user]); // eslint-disable-line react-hooks/exhaustive-deps
  return useAsyncData(load);
}

/**
 * The completed-profile card: 'auto' until the vendor first reaches 100% (it celebrates once, then
 * becomes 'hidden'); 'shown' after the vendor brings it back from Edit Profile. Only applies at 100%:
 * an incomplete profile always shows the card. A per-device display preference, not data.
 */
export type CompletenessCardPref = 'auto' | 'hidden' | 'shown';

const prefKey = (vendorId: string) => `gwani:completeness-card:${vendorId}`;

function readPref(vendorId: string): CompletenessCardPref {
  try {
    const v = window.localStorage.getItem(prefKey(vendorId));
    return v === 'hidden' || v === 'shown' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function useCompletenessCardPref() {
  const { vendorId } = useCurrentVendor();
  const [pref, setPrefState] = useState(() => readPref(vendorId));
  const setPref = useCallback(
    (next: CompletenessCardPref) => {
      setPrefState(next);
      try {
        window.localStorage.setItem(prefKey(vendorId), next);
      } catch {
        // Storage blocked: the choice lasts until reload.
      }
    },
    [vendorId]
  );
  return { pref, setPref };
}

const priceOf = (raw: string) => Number(raw.replace(/[₦,\s]/g, '')) || 0;

/**
 * The editor's live score: the same helper as the saved score, fed the form's current (unsaved) values
 * plus the account facts from the last saved result. Recomputed on every change; nothing is stored.
 * Call inside the profile form's FormProvider.
 */
export function useDraftCompleteness(saved: MyProfileCompleteness | null, productCount: number): ProfileCompleteness | null {
  const { control } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  const values = useWatch({ control }) as ProfileFormValues;
  return useMemo(() => {
    if (!saved) return null;
    return calculateProfileCompleteness({
      kind: completenessKindOf(values.tradeCategory),
      profile: {
        photo: values.photo,
        name: values.name,
        tradeCategory: values.tradeCategory,
        tradeCategoryOther: values.tradeCategoryOther,
        bio: values.bio,
        gallery: values.gallery,
        services: values.services.map((s) => ({ minPrice: priceOf(s.minPrice), maxPrice: priceOf(s.maxPrice) })),
        productCount,
        workingHours: values.workingHours,
        serviceAreas: values.serviceAreas
      },
      account: saved.account
    });
  }, [values, saved, productCount]);
}
