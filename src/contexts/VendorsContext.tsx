import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { vendors as seedVendors } from '../data/vendors';
import { applyVendorPatch } from '../services/vendorStore';
import type { Vendor, VendorProfilePatch } from '../types/marketplace';

interface VendorsContextValue {
  vendors: Vendor[];
  getVendor: (id: string) => Vendor | undefined;
  updateVendorProfile: (id: string, patch: VendorProfilePatch) => void;
}

const VendorsContext = createContext<VendorsContextValue | null>(null);

export function VendorsProvider({ children }: {children: React.ReactNode;}) {
  const [vendors, setVendors] = useState<Vendor[]>(seedVendors);

  const getVendor = useCallback((id: string) => vendors.find((v) => v.id === id), [vendors]);

  const updateVendorProfile = useCallback((id: string, patch: VendorProfilePatch) => {
    setVendors((prev) => prev.map((v) => v.id === id ? { ...v, ...patch } : v));
    // Keep the mock API's copy in step so customer search sees the change.
    applyVendorPatch(id, patch);
  }, []);

  const value = useMemo(() => ({ vendors, getVendor, updateVendorProfile }), [vendors, getVendor, updateVendorProfile]);

  return <VendorsContext.Provider value={value}>{children}</VendorsContext.Provider>;
}

export function useVendors(): VendorsContextValue {
  const ctx = useContext(VendorsContext);
  if (!ctx) throw new Error('useVendors must be used within VendorsProvider');
  return ctx;
}
