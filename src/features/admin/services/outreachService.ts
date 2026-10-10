import { ApiError, mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { JOB_ACTOR } from '../../jobs/constants';
import { recordAccountMessage } from '../../jobs/services/notificationService';
import { DASHBOARD_ROUTES } from '../../vendor-dashboard/constants';
import { ADMIN_PERMISSION } from '../config/roles';
import { AUDIT_ACTION } from '../constants';
import { requirePermission } from './adminSession';
import { recordAudit } from './auditService';
import type { Vendor } from '../../../types/marketplace';
import type { AuditEntry } from '../types';

/*
 * Following up with at-risk vendors (our backend, mocked): from the SLA and churn dashboards (Analyst,
 * Super admin) and the Vendor outreach page (Support). Messages go through the notification service the
 * rest of the app uses; flags are internal only. Every action is written to the audit log, which is also
 * where the lists read "Reminder sent 2h ago by …" from.
 */

function currentVendor(vendorId: string): Vendor {
  const vendor = getAllVendors().find((v) => v.id === vendorId);
  if (!vendor) throw new ApiError('That vendor isn’t on Gwani any more.', 404);
  return vendor;
}

const target = (v: Vendor) => ({ type: 'vendor' as const, id: v.id, label: v.name });
const note = (text?: string) => text?.trim() || null;

/** POST /admin/outreach/:vendorId/sla-reminder — a nudge about slow replies (notification to the vendor). */
export function sendSlaReminder(vendorId: string, context: string): Promise<AuditEntry> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.VendorOutreach);
    const vendor = currentVendor(vendorId);
    recordAccountMessage(JOB_ACTOR.Vendor, vendor.id, 'common:message.slaReminder', () => ({}), DASHBOARD_ROUTES.requests);
    return recordAudit(admin, AUDIT_ACTION.VendorSlaReminder, target(vendor), { details: context });
  }, 400);
}

/** POST /admin/outreach/:vendorId/sla-flag — mark for a response-time review (internal; the vendor isn't told). */
export function flagForSlaReview(vendorId: string, context: string, reason?: string): Promise<AuditEntry> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.VendorOutreach);
    return recordAudit(admin, AUDIT_ACTION.VendorSlaFlag, target(currentVendor(vendorId)), { reason: note(reason), details: context });
  }, 400);
}

/** POST /admin/outreach/:vendorId/reengage — a friendly "we'd like to keep you" message (mock notification). */
export function sendReengagement(vendorId: string, context: string): Promise<AuditEntry> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.VendorOutreach);
    const vendor = currentVendor(vendorId);
    recordAccountMessage(JOB_ACTOR.Vendor, vendor.id, 'common:message.reengage', () => ({}), DASHBOARD_ROUTES.subscription);
    return recordAudit(admin, AUDIT_ACTION.VendorReengage, target(vendor), { details: context });
  }, 400);
}

/** POST /admin/outreach/:vendorId/flag — mark for a call or visit from Support (internal). */
export function flagForOutreach(vendorId: string, context: string, reason?: string): Promise<AuditEntry> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.VendorOutreach);
    return recordAudit(admin, AUDIT_ACTION.VendorOutreachFlag, target(currentVendor(vendorId)), { reason: note(reason), details: context });
  }, 400);
}
