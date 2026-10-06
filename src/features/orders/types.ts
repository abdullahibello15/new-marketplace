import type { NigerLga, VendorFulfilment } from '../../types/marketplace';
import type { StarLevel } from '../vendor-dashboard/types';
import type { CART_CHANGE_KIND, FULFILMENT_METHOD, ORDER_ACTOR, ORDER_STATUS } from './constants';

type ValueOf<T> = T[keyof T];

export type OrderStatus = ValueOf<typeof ORDER_STATUS>;
/** Who made a change: the customer, the vendor, or the platform itself (auto-completing). */
export type OrderActor = ValueOf<typeof ORDER_ACTOR>;
export type OrderParty = Exclude<OrderActor, 'system'>;
export type FulfilmentMethod = ValueOf<typeof FULFILMENT_METHOD>;
export type OrderStatusFilter = 'all' | OrderStatus;

/** One entry in an order's audit trail. */
export interface OrderStatusChange {
  status: OrderStatus;
  /** ISO timestamp. */
  at: string;
  by: OrderActor;
  /** Optional context, e.g. a cancel reason or which items were out of stock. */
  note?: string;
}

export interface OrderItem {
  productId: string;
  /** Copied at checkout so the order reads the same if the vendor later edits the product. */
  name: string;
  image: string | null;
  /** Whole Naira, the price the customer agreed to at checkout. */
  unitPrice: number;
  quantity: number;
  /** The vendor marked this line out of stock when confirming: not supplied and not charged. */
  outOfStock: boolean;
}

export interface OrderDeliveryDetails {
  /** Street, house number or landmark, as the customer wrote it. */
  landmark: string;
  placeId: string;
  /** e.g. "Tunga, Minna" */
  placeLabel: string;
  lga: NigerLga;
  phone: string;
}

export interface OrderPickupDetails {
  /** The vendor's pickup point and instructions at the time of the order. */
  address: string;
  instructions: string;
}

export interface OrderReview {
  rating: StarLevel;
  comment: string;
  at: string;
}

/** One vendor's part of a checkout. A checkout with three vendors creates three orders sharing `checkoutRef`. */
export interface Order {
  id: string;
  checkoutRef: string;
  vendorId: string;
  /** Denormalised so lists don't need a vendor lookup. */
  vendorName: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  method: FulfilmentMethod;
  /** Set for delivery orders. */
  delivery: OrderDeliveryDetails | null;
  /** Set for pickup orders. */
  pickup: OrderPickupDetails | null;
  /** Sum of the in-stock lines. */
  itemsTotal: number;
  /** The vendor's delivery fee (MOCK, never charged); 0 for pickup. */
  deliveryFee: number;
  /** itemsTotal + deliveryFee. */
  total: number;
  status: OrderStatus;
  /** Oldest first. Never edited, only appended to. */
  history: OrderStatusChange[];
  /** True once the vendor confirmed and stock was taken; cancelling then puts it back. */
  stockReserved: boolean;
  review: OrderReview | null;
  /** The customer chose not to review; the prompt stays hidden. */
  reviewSkipped: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Cart ---------- */

export interface CartItem {
  vendorId: string;
  vendorName: string;
  productId: string;
  name: string;
  image: string | null;
  /** Whole Naira, as seen when added (or last checked). Checkout compares it with the live price. */
  unitPrice: number;
  quantity: number;
  /** Stock when added (or last checked). Caps the quantity stepper. */
  maxQuantity: number;
  addedAt: string;
}

export interface CartVendorGroup {
  vendorId: string;
  vendorName: string;
  items: CartItem[];
  /** Units, not lines. */
  itemCount: number;
  subtotal: number;
}

export type AddToCartResult = {ok: true;quantity: number;} | {ok: false;message: string;};

/* ---------- Checkout ---------- */

export type CartChangeKind = ValueOf<typeof CART_CHANGE_KIND>;

/** Something that changed between adding to cart and checking out. */
export interface CartChange {
  kind: CartChangeKind;
  vendorId: string;
  vendorName: string;
  productId: string;
  name: string;
  /** Old and new price (price_changed) or quantity (quantity_reduced). 0 when the item is gone. */
  before: number;
  after: number;
}

/** What checkout needs to know about each vendor in the cart. */
export interface CheckoutVendor {
  vendorId: string;
  vendorName: string;
  fulfilment: VendorFulfilment;
}

/** The cart as the server sees it now: corrected lines, what changed, and each vendor's options. */
export interface CartCheck {
  items: CartItem[];
  changes: CartChange[];
  vendors: CheckoutVendor[];
}

export interface CheckoutOrderInput {
  vendorId: string;
  method: FulfilmentMethod;
  /** Prices are the ones the customer saw; the server rejects the checkout if they no longer match. */
  items: {productId: string;quantity: number;unitPrice: number;}[];
}

export interface CheckoutInput {
  orders: CheckoutOrderInput[];
  /** Required when any order is for delivery; shared by all of them. */
  delivery: OrderDeliveryDetails | null;
}

export interface CheckoutResult {
  checkoutRef: string;
  orders: Order[];
}
