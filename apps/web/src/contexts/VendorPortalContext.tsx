import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { vendorRequests } from '../data/vendorPortal';
import type { VendorRequest } from '../types/vendorPortal';

interface VendorPortalValue {
  requests: VendorRequest[];
  sendQuote: (id: string, amount: number, note: string) => void;
  declineRequest: (id: string) => void;
  restoreRequest: (id: string) => void;
}

const VendorPortalContext = createContext<VendorPortalValue | null>(null);

export function VendorPortalProvider({ children }: {children: React.ReactNode;}) {
  const [requests, setRequests] = useState<VendorRequest[]>(vendorRequests);

  const updateRequest = useCallback((id: string, patch: Partial<VendorRequest>) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  }, []);

  const sendQuote = useCallback(
    (id: string, amount: number, note: string) => updateRequest(id, { status: 'quoted', quote: amount, note }),
    [updateRequest]
  );
  const declineRequest = useCallback((id: string) => updateRequest(id, { status: 'declined' }), [updateRequest]);
  const restoreRequest = useCallback(
    (id: string) => updateRequest(id, { status: 'awaiting_quote', quote: null, note: '' }),
    [updateRequest]
  );

  const value = useMemo(
    () => ({ requests, sendQuote, declineRequest, restoreRequest }),
    [requests, sendQuote, declineRequest, restoreRequest]
  );

  return <VendorPortalContext.Provider value={value}>{children}</VendorPortalContext.Provider>;
}

export function useVendorPortal(): VendorPortalValue {
  const ctx = useContext(VendorPortalContext);
  if (!ctx) throw new Error('useVendorPortal must be used within VendorPortalProvider');
  return ctx;
}