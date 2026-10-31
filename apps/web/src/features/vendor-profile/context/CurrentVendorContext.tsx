import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError } from '../../../services/mockApi';
import { getApiAccessToken } from '../../../services/apiClient';
import { currentAccessToken } from '../../auth/session';
import { updateSessionUser } from '../../auth/session';
import { useAuth } from '../../auth/hooks/useAuth';
import { useVendors } from '../../../contexts/VendorsContext';
import type { Vendor, VendorProfilePatch } from '../../../types/marketplace';
import { getCurrentVendor } from '../services/vendorProfileService';

type State = { owner: string; status: 'loading' | 'ready' | 'missing' | 'error'; vendor?: Vendor; error?: unknown };
interface Value extends State {
  clear: () => void;
  reload: () => Promise<void>;
  update: (patch: VendorProfilePatch) => void;
  live: boolean;
}
const Context = createContext<Value | null>(null);

export function CurrentVendorProvider({ children }: { children: ReactNode }) {
  const { user, status, ended } = useAuth();
  const { getVendor, updateVendorProfile } = useVendors();
  const live = Boolean(currentAccessToken() && currentAccessToken() === getApiAccessToken());
  const owner = `${user?.id ?? ''}:${ended?.id ?? ''}:${live ? 'live' : 'mock'}`;
  const mockVendor = user?.vendorId ? getVendor(user.vendorId) : undefined;
  const [state, setState] = useState<State>({ owner, status: 'loading' });

  const reload = useCallback(async () => {
    if (!user || status !== 'signed_in') return;
    if (!live) {
      setState({ owner, status: mockVendor ? 'ready' : 'missing', vendor: mockVendor });
      return;
    }
    setState({ owner, status: 'loading' });
    try {
      const vendor = await getCurrentVendor();
      if (user.vendorId !== vendor.id) updateSessionUser({ ...user, vendorId: vendor.id });
      setState({ owner, status: 'ready', vendor });
    } catch (error) {
      setState({ owner, status: error instanceof ApiError && error.status === 404 ? 'missing' : 'error', error });
    }
  }, [live, mockVendor, owner, status, user]);

  useEffect(() => {
    if (status === 'signed_out' || !user) {
      setState({ owner, status: 'loading' });
      return;
    }
    void reload();
  }, [owner, reload, status, user]);

  const clear = useCallback(() => setState({ owner: '', status: 'loading' }), []);
  const update = useCallback((patch: VendorProfilePatch) => {
    setState((current) => current.vendor ? { ...current, vendor: { ...current.vendor, ...patch } } : current);
    if (!live && user?.vendorId) updateVendorProfile(user.vendorId, patch);
  }, [live, updateVendorProfile, user?.vendorId]);
  const value = useMemo<Value>(() => ({ ...(state.owner === owner ? state : { owner, status: 'loading' as const }), clear, reload, update, live }), [clear, live, owner, reload, state, update]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCurrentVendorData(): Value {
  const value = useContext(Context);
  if (!value) throw new Error('useCurrentVendorData must be used inside CurrentVendorProvider');
  return value;
}
