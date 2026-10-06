import { StatusSteps, type StatusStep } from '../../../components/ui/StatusSteps';
import { ORDER_SIDE_BRANCHES, ORDER_STATUS_META } from '../constants';
import { lastOrderPathStatus, orderPath, orderReachedAt } from '../stateMachine';
import type { Order } from '../types';

/** The order's own path (delivery or pickup) up to where it is, or where it stopped plus the side-branch end. */
function buildSteps(order: Pick<Order, 'status' | 'history' | 'method'>): StatusStep[] {
  const path = orderPath(order);
  const branched = ORDER_SIDE_BRANCHES.includes(order.status);
  const lastIndex = path.indexOf(branched ? lastOrderPathStatus(order) : order.status);

  const steps: StatusStep[] = path.map((status, i) => ({
    key: status,
    label: ORDER_STATUS_META[status].label,
    at: i <= lastIndex ? orderReachedAt(order, status) : null,
    state: i < lastIndex || i === lastIndex && branched ? 'done' : i === lastIndex ? 'current' : 'upcoming'
  }));
  if (!branched) return steps;
  return [
  ...steps.slice(0, lastIndex + 1),
  { key: order.status, label: ORDER_STATUS_META[order.status].label, state: 'stopped', at: orderReachedAt(order, order.status) }];

}

/**
 * Order progress, using the same step display as jobs. Delivery orders show Dispatched → Delivered;
 * pickup orders show Ready for pickup → Collected.
 */
export function OrderTimeline({ order }: {order: Pick<Order, 'status' | 'history' | 'method'>;}) {
  return <StatusSteps steps={buildSteps(order)} label="Order progress" stoppedText="order ended here" />;
}
