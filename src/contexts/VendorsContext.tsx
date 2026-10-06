import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyVendorPatch, getAllVendors, subscribeVendors } from '../services/vendorStore';
import type { Vendor, VendorProfilePatch } from '../types/marketplace';

interface VendorsContextValue {
  vendors: Vendor[];
  getVendor: (id: string) => Vendor | undefined;
  updateVendorProfile: (id: string, patch: VendorProfilePatch) => void;
}

const VendorsContext = createContext<VendorsContextValue | null>(null);

export function VendorsProvider({ children }: {children: React.ReactNode;}) {
  const [vendors, setVendors] = useState<Vendor[]>(() => [...getAllVendors()]);

  // The mock API's vendor store is the source of truth: profile edits write to it, and so do services
  // (an order confirmed by the vendor reduces stock), so the vendor's product pages always match.
  useEffect(() => subscribeVendors(() => setVendors([...getAllVendors()])), []);

  const getVendor = useCallback((id: string) => vendors.find((v) => v.id === id), [vendors]);

  const updateVendorProfile = useCallback((id: string, patch: VendorProfilePatch) => applyVendorPatch(id, patch), []);

  const value = useMemo(() => ({ vendors, getVendor, updateVendorProfile }), [vendors, getVendor, updateVendorProfile]);

  return <VendorsContext.Provider value={value}>{children}</VendorsContext.Provider>;
}

export function useVendors(): VendorsContextValue {
  const ctx = useContext(VendorsContext);
  if (!ctx) throw new Error('useVendors must be used within VendorsProvider');
  return ctx;
}
