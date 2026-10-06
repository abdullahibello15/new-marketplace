import { user } from '../../../data/user';
import { CURRENT_CUSTOMER_ID } from '../../jobs/constants';
import { FULFILMENT_METHOD, ORDER_ACTOR } from '../constants';
import type { FulfilmentMethod, Order, OrderDeliveryDetails, OrderItem, OrderPickupDetails, OrderReview, OrderStatus, OrderStatusChange } from '../types';

/** ISO time `minutes` ago, so the mock data stays current. */
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const HOUR = 60;
const DAY = 24 * HOUR;

const { Customer, Vendor } = ORDER_ACTOR;
const step = (status: OrderStatus, minutesAgo: number, by: OrderStatusChange['by'], note?: string): OrderStatusChange => ({
  status,
  at: ago(minutesAgo),
  by,
  ...(note ? { note } : {})
});

const IMG = {
  tap: '/a9d11f11-7784-4fed-80c6-44c46b6c48d4.jpg',
  tank: '/b5817d72-46c7-4bc6-9b8d-d3a4479a8955.jpg',
  tools: '/7dc19955-5e58-4910-a155-bea401f35289.jpg',
  fabric: '/a149d194-c7e0-476e-aee4-cd560be7cc60.jpg',
  bike: '/5f3ebb40-48fe-44e2-93d2-54fbf5cc1df0.jpg'
};

const item = (productId: string, name: string, image: string, unitPrice: number, quantity: number, outOfStock = false): OrderItem => ({
  productId,
  name,
  image,
  unitPrice,
  quantity,
  outOfStock
});

const AISHA_DELIVERY: OrderDeliveryDetails = {
  landmark: 'Behind NEPA office, blue gate',
  placeId: 'town-tunga',
  placeLabel: 'Tunga, Minna',
  lga: 'Chanchaga',
  phone: '0803 555 0142'
};

const BALA = { vendorId: 'bala-plumbing', vendorName: 'Bala Plumbing Services' };
const BALA_PICKUP: OrderPickupDetails = { address: 'Shop 4, Tunga Market Road, Minna', instructions: 'Ask for Bala at the blue kiosk. Open Mon–Sat, 8am–6pm.' };
const HAUWA = { vendorId: 'hauwa-tailoring', vendorName: 'Hauwa Tailoring & Ankara' };
const FATIMA = { vendorId: 'fatima-fresh-foods', vendorName: 'Fatima Fresh Foods' };

interface Seed {
  id: string;
  checkoutRef: string;
  vendorId: string;
  vendorName: string;
  customerName: string;
  items: OrderItem[];
  method: FulfilmentMethod;
  delivery?: OrderDeliveryDetails;
  pickup?: OrderPickupDetails;
  deliveryFee?: number;
  history: OrderStatusChange[];
  review?: OrderReview;
}

/** Statuses after the vendor confirmed, i.e. stock was taken (and is put back if the order is cancelled). */
const RESERVED_AFTER: OrderStatus[] = ['confirmed', 'preparing', 'dispatched', 'delivered', 'ready_for_pickup', 'collected', 'completed', 'cancelled'];

function order(seed: Seed): Order {
  const last = seed.history[seed.history.length - 1];
  const itemsTotal = seed.items.filter((i) => !i.outOfStock).reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const deliveryFee = seed.method === FULFILMENT_METHOD.Delivery ? seed.deliveryFee ?? 0 : 0;
  const isAisha = seed.customerName === user.fullName;
  const wasConfirmed = seed.history.some((h) => h.status === 'confirmed');
  return {
    id: seed.id,
    checkoutRef: seed.checkoutRef,
    vendorId: seed.vendorId,
    vendorName: seed.vendorName,
    customerId: isAisha ? CURRENT_CUSTOMER_ID : `cust-${seed.customerName.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    customerName: seed.customerName,
    items: seed.items,
    method: seed.method,
    delivery: seed.method === FULFILMENT_METHOD.Delivery ? seed.delivery ?? null : null,
    pickup: seed.method === FULFILMENT_METHOD.Pickup ? seed.pickup ?? null : null,
    itemsTotal,
    deliveryFee,
    total: itemsTotal + deliveryFee,
    status: last.status,
    history: seed.history,
    // Seeded stock levels already reflect these orders; a cancelled one gave its stock back at the time.
    stockReserved: wasConfirmed && RESERVED_AFTER.includes(last.status) && last.status !== 'cancelled',
    review: seed.review ?? null,
    reviewSkipped: false,
    createdAt: seed.history[0].at,
    updatedAt: last.at
  };
}

export const mockOrders: Order[] = [
// New orders for the demo vendor (Bala) to confirm or decline.
order({
  id: '5012',
  checkoutRef: 'CHK-731904',
  ...BALA,
  customerName: user.fullName,
  items: [item('p1', 'Kitchen mixer tap (chrome)', IMG.tap, 9500, 2)],
  method: FULFILMENT_METHOD.Delivery,
  delivery: AISHA_DELIVERY,
  deliveryFee: 1500,
  history: [step('placed', 25, Customer)]
}),
order({
  id: '5011',
  checkoutRef: 'CHK-731904',
  ...FATIMA,
  customerName: user.fullName,
  items: [item('fatima-fresh-foods-p1', 'Local rice, 5kg', IMG.bike, 7500, 2), item('fatima-fresh-foods-p5', 'Fresh pepper mix (bag)', IMG.bike, 2500, 1)],
  method: FULFILMENT_METHOD.Delivery,
  delivery: AISHA_DELIVERY,
  deliveryFee: 1000,
  history: [step('placed', 25, Customer), step('confirmed', 18, Vendor), step('preparing', 10, Vendor)]
}),
order({
  id: '5010',
  checkoutRef: 'CHK-688120',
  ...BALA,
  customerName: 'Musa Kabiru',
  items: [item('p2', '1,000L water tank', IMG.tank, 78000, 1), item('p3', '1HP surface pump', IMG.tank, 65000, 1)],
  method: FULFILMENT_METHOD.Pickup,
  pickup: BALA_PICKUP,
  history: [step('placed', 2 * HOUR, Customer)]
}),
// In progress.
order({
  id: '5008',
  checkoutRef: 'CHK-602217',
  ...BALA,
  customerName: 'Ngozi Adeyemi',
  items: [item('p1', 'Kitchen mixer tap (chrome)', IMG.tap, 9500, 1)],
  method: FULFILMENT_METHOD.Delivery,
  delivery: { landmark: 'House 14, Bosso Estate', placeId: 'lga-bosso', placeLabel: 'Bosso, Minna', lga: 'Bosso', phone: '0812 340 7781' },
  deliveryFee: 1500,
  history: [step('placed', DAY + 3 * HOUR, Customer), step('confirmed', DAY + 2 * HOUR, Vendor), step('preparing', DAY, Vendor), step('dispatched', 40, Vendor)]
}),
order({
  id: '5007',
  checkoutRef: 'CHK-588410',
  ...HAUWA,
  customerName: user.fullName,
  items: [item('p13', 'Gele head tie', IMG.fabric, 4500, 2), item('p12', 'Ready-made kaftan', IMG.fabric, 18500, 1, true)],
  method: FULFILMENT_METHOD.Pickup,
  pickup: { address: 'Hauwa Tailoring, opposite Chanchaga Primary School', instructions: 'Call when you arrive and I’ll bring your order out.' },
  history: [
  step('placed', 2 * DAY, Customer),
  step('confirmed', 2 * DAY - HOUR, Vendor, '1 item out of stock: Ready-made kaftan'),
  step('preparing', DAY + 5 * HOUR, Vendor),
  step('ready_for_pickup', 3 * HOUR, Vendor)]

}),
// Waiting for Aisha to confirm receipt.
order({
  id: '5006',
  checkoutRef: 'CHK-588410',
  ...FATIMA,
  customerName: user.fullName,
  items: [item('fatima-fresh-foods-p2', 'Honey beans, 5kg', IMG.bike, 9000, 1)],
  method: FULFILMENT_METHOD.Delivery,
  delivery: AISHA_DELIVERY,
  deliveryFee: 1000,
  history: [
  step('placed', 2 * DAY, Customer),
  step('confirmed', 2 * DAY - 30, Vendor),
  step('preparing', 2 * DAY - 60, Vendor),
  step('dispatched', 2 * DAY - 120, Vendor),
  step('delivered', 5 * HOUR, Vendor)]

}),
// Done: one to review, one reviewed.
order({
  id: '5004',
  checkoutRef: 'CHK-511093',
  ...BALA,
  customerName: user.fullName,
  items: [item('p4', 'Pipe wrench, 14 inch', IMG.tools, 7500, 1), item('p1', 'Kitchen mixer tap (chrome)', IMG.tap, 9500, 1)],
  method: FULFILMENT_METHOD.Pickup,
  pickup: BALA_PICKUP,
  history: [
  step('placed', 6 * DAY, Customer),
  step('confirmed', 6 * DAY - 40, Vendor),
  step('preparing', 6 * DAY - 90, Vendor),
  step('ready_for_pickup', 5 * DAY, Vendor),
  step('collected', 4 * DAY, Vendor),
  step('completed', 4 * DAY - 60, Customer)]

}),
order({
  id: '5003',
  checkoutRef: 'CHK-498221',
  ...BALA,
  customerName: 'Ibrahim Sule',
  items: [item('p1', 'Kitchen mixer tap (chrome)', IMG.tap, 9500, 3)],
  method: FULFILMENT_METHOD.Delivery,
  delivery: { landmark: 'Opposite First Bank, Mobil roundabout', placeId: 'lga-chanchaga', placeLabel: 'Chanchaga, Minna', lga: 'Chanchaga', phone: '0706 221 9934' },
  deliveryFee: 1500,
  history: [
  step('placed', 12 * DAY, Customer),
  step('confirmed', 12 * DAY - 30, Vendor),
  step('preparing', 12 * DAY - 60, Vendor),
  step('dispatched', 11 * DAY, Vendor),
  step('delivered', 11 * DAY - 90, Vendor),
  step('completed', 11 * DAY - 120, Customer)],

  review: { rating: 5, comment: 'Tap arrived the same day and works perfectly. Rider called before coming.', at: ago(11 * DAY - 150) }
}),
// Ended early.
order({
  id: '5002',
  checkoutRef: 'CHK-470552',
  ...FATIMA,
  customerName: user.fullName,
  items: [item('fatima-fresh-foods-p4', 'Groundnut oil, 3L', IMG.bike, 8500, 2)],
  method: FULFILMENT_METHOD.Pickup,
  pickup: { address: 'Stall 31, Kure Market (foodstuff line), Minna', instructions: 'Collect before 5pm. Show your order number at the stall.' },
  history: [step('placed', 9 * DAY, Customer), step('out_of_stock', 9 * DAY - 45, Vendor, 'Sold out of groundnut oil')]
}),
order({
  id: '5001',
  checkoutRef: 'CHK-455019',
  ...BALA,
  customerName: 'Musa Kabiru',
  items: [item('p2', '1,000L water tank', IMG.tank, 78000, 1)],
  method: FULFILMENT_METHOD.Delivery,
  delivery: { landmark: 'Behind Bosso market', placeId: 'lga-bosso', placeLabel: 'Bosso, Minna', lga: 'Bosso', phone: '0803 118 2290' },
  deliveryFee: 1500,
  history: [step('placed', 15 * DAY, Customer), step('confirmed', 15 * DAY - 20, Vendor), step('cancelled', 15 * DAY - 60, Customer, 'I found it elsewhere')]
})];
