import { addMonths, endOfDay, startOfDay, subMonths } from 'date-fns';
import { vendorAccount } from '../../../data/vendorPortal';
import { INVOICE_KIND, INVOICE_STATUS, PLAN_ID } from '../constants';
import { daysFromNow } from './time';
import type { Invoice, Subscription } from '../types';

/** Standard plan that renews in 5 days, so the "ends soon" warning shows by default. */
const renewsOn = daysFromNow(5, 23, 59);
const periodStart = startOfDay(subMonths(new Date(renewsOn), 1)).toISOString();

export const mockSubscription: Subscription = {
  vendorId: vendorAccount.vendorId,
  planId: PLAN_ID.Standard,
  periodStart,
  renewsOn,
  startedAt: daysFromNow(-120, 10),
  scheduledChange: null
};

/** Past invoices: three monthly Standard renewals and the original Starter sign-up. */
function paidInvoice(id: string, monthsAgo: number, planId: Invoice['planId'], kind: Invoice['kind'], method: Invoice['method'], amount: number): Invoice {
  const start = startOfDay(subMonths(new Date(periodStart), monthsAgo));
  const paidAt = new Date(start.getTime() - 2 * 86_400_000).toISOString();
  return {
    id,
    vendorId: vendorAccount.vendorId,
    kind,
    planId,
    fromPlanId: planId,
    amount,
    lines: [{ label: `${planId === PLAN_ID.Starter ? 'Starter' : 'Standard'}, 1 month`, amount }],
    periodStart: start.toISOString(),
    periodEnd: endOfDay(addMonths(start, 1)).toISOString(),
    effectiveAt: start.toISOString(),
    status: INVOICE_STATUS.Paid,
    createdAt: paidAt,
    paidAt,
    paymentReference: `GW-SUB-${id.slice(4)}`,
    method
  };
}

export const mockInvoices: Invoice[] = [
paidInvoice('INV-1004', 0, PLAN_ID.Standard, INVOICE_KIND.Renew, 'transfer', 7000),
paidInvoice('INV-1003', 1, PLAN_ID.Standard, INVOICE_KIND.Renew, 'card', 7000),
paidInvoice('INV-1002', 2, PLAN_ID.Standard, INVOICE_KIND.Upgrade, 'ussd', 7000),
paidInvoice('INV-1001', 3, PLAN_ID.Starter, INVOICE_KIND.Subscribe, 'card', 2000)];
