import { describe, expect, it } from 'vitest';
import { getAllVendors } from '../../../services/vendorStore';
import { buildDraftVendor } from '../utils/draftVendor';
import { getProfileCompletenessForVendorSession } from './profileCompletenessService';

describe('live profile completeness', () => {
  it('computes completeness from an API vendor absent from the mock store', async () => {
    const vendor = buildDraftVendor({
      id: '9e71c2f0-8a4f-4b26-bd19-7d9a2f617000',
      businessName: 'Database Only Shop',
      tradeCategory: 'grocer',
      lga: 'Bosso',
      town: 'Maitumbi',
    });
    expect(getAllVendors().some((candidate) => candidate.id === vendor.id)).toBe(false);

    const result = await getProfileCompletenessForVendorSession(vendor.id, {
      mode: 'live',
      vendor,
      account: { phoneVerified: true, emailAdded: true, documentsSubmitted: false },
    });

    expect(result.kind).toBe('retail');
    expect(result.account).toEqual({ phoneVerified: true, emailAdded: true, documentsSubmitted: false });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('does not fall back to the mock store when a live vendor has not loaded', async () => {
    await expect(getProfileCompletenessForVendorSession('missing-live-vendor', {
      mode: 'live',
      vendor: undefined,
      account: { phoneVerified: false, emailAdded: false, documentsSubmitted: false },
    })).rejects.toMatchObject({ status: 404 });
  });
});
