import { createContext } from 'react';
import type { AsyncStatus } from '../../../hooks/useAsyncData';
import type { Order } from '../types';

export interface VendorOrdersContextValue {
  /** This vendor's orders only (their part of each checkout). */
  orders: Order[];
  status: AsyncStatus;
  error: string | null;
  reload: () => void;
  /** Swap in an order returned by an action without refetching. */
  replaceOrder: (order: Order) => void;
  /** Orders waiting to be confirmed or declined; shown as the nav badge. */
  newCount: number;
}

export const VendorOrdersContext = createContext<VendorOrdersContextValue | null>(null);
