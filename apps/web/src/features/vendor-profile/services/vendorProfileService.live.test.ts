import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../services/apiClient';
import { getCurrentVendor } from './vendorProfileService';

vi.mock('../../../services/apiClient', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../services/apiClient')>(),
  apiRequest: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

describe('live vendor profile read', () => {
  it('loads and adapts the provider profile from GET /v1/vendors/me', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      id: 'db-vendor-1', businessName: 'Database Workshop', town: 'Maitumbi', lga: 'Bosso', tradeCategory: 'carpenter',
      bio: 'Carpentry services', services: [{ id: 'svc-1', name: 'Repairs' }],
    });
    await expect(getCurrentVendor()).resolves.toMatchObject({
      id: 'db-vendor-1', name: 'Database Workshop', about: 'Carpentry services',
      services: [{ id: 'svc-1', name: 'Repairs' }],
    });
    expect(apiRequest).toHaveBeenCalledWith('/v1/vendors/me');
  });

  it('preserves a 404 so the portal guard can show the missing-profile state', async () => {
    vi.mocked(apiRequest).mockRejectedValue({ status: 404 });
    await expect(getCurrentVendor()).rejects.toMatchObject({ status: 404 });
  });
});
