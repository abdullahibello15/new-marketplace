import { useContext } from 'react';
import { VendorOrdersContext, type VendorOrdersContextValue } from '../context/vendorOrdersContext';

export function useVendorOrders(): VendorOrdersContextValue {
  const ctx = useContext(VendorOrdersContext);
  if (!ctx) throw new Error('useVendorOrders must be used within VendorOrdersProvider');
  return ctx;
}
