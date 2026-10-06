import React, { useCallback, useMemo } from 'react';
import { vendorAccount } from '../../../data/vendorPortal';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { ORDER_STATUS } from '../constants';
import { listVendorOrders } from '../services/orderService';
import { VendorOrdersContext, type VendorOrdersContextValue } from './vendorOrdersContext';
import type { Order } from '../types';

const EMPTY: Order[] = [];
const loadVendorOrders = () => listVendorOrders(vendorAccount.vendorId);

/** The signed-in vendor's orders, shared by the orders list, order details and the nav badge. */
export function VendorOrdersProvider({ children }: {children: React.ReactNode;}) {
  const { data, status, error, reload, setData } = useAsyncData(loadVendorOrders);
  const orders = data ?? EMPTY;

  const replaceOrder = useCallback((order: Order) => setData((prev) => prev.map((o) => o.id === order.id ? order : o)), [setData]);
  const newCount = useMemo(() => orders.filter((o) => o.status === ORDER_STATUS.Placed).length, [orders]);

  const value = useMemo<VendorOrdersContextValue>(
    () => ({ orders, status, error, reload, replaceOrder, newCount }),
    [orders, status, error, reload, replaceOrder, newCount]
  );

  return <VendorOrdersContext.Provider value={value}>{children}</VendorOrdersContext.Provider>;
}
