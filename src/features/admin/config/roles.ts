/*
 * Admin roles: the ONE place that says which sections each role sees and which actions it may take.
 * The admin layout hides sections and the screens hide buttons a role can't use, and the admin services
 * refuse those actions too.
 *
 * ⚠️ This is UI convenience only. Real enforcement MUST happen on the backend: every admin endpoint has
 * to check the signed-in staff member's role itself, because anything in the browser can be bypassed.
 */

export const ADMIN_SECTION = {
  Verification: 'verification',
  Disputes: 'disputes',
  Moderation: 'moderation',
  Analytics: 'analytics',
  Outreach: 'outreach',
  BulkTools: 'bulk',
  Audit: 'audit',
  Admins: 'admins'
} as const;

export const ADMIN_PERMISSION = {
  /** Claim and review vendor verification applications (checklist, notes). */
  VerificationReview: 'verification.review',
  /** Approve, reject or request more information. */
  VerificationDecide: 'verification.decide',
  /** See an ID number in full (logged). */
  RevealIdNumber: 'verification.reveal_id',
  /** Claim disputes, message both parties, request evidence, add internal notes. */
  DisputeMediate: 'disputes.mediate',
  /** Release, refund, partially refund or dismiss. */
  DisputeResolve: 'disputes.resolve',
  /** Approve, remove and warn; decide appeals. */
  ModerationReview: 'moderation.review',
  /** Suspend a vendor. */
  ModerationSuspend: 'moderation.suspend',
  /** Take over an item another admin has claimed. */
  OverrideClaim: 'claims.override',
  /** See the analytics dashboard (platform figures: vendors, GMV, subscription revenue). */
  ViewAnalytics: 'analytics.view',
  /** Act on at-risk vendors: SLA reminders, re-engagement messages, flags for review or outreach (all audited). */
  VendorOutreach: 'vendors.outreach',
  /** Run bulk imports (trade-association vendor imports), undo them and resend invitations. */
  BulkImport: 'vendors.bulk_import',
  /**
   * The Admins page: invite staff, change their role, suspend, reactivate and remove them. Super admin
   * only. ⚠️ The backend must check this on every admin-management endpoint, not just the UI.
   */
  ManageAdmins: 'admins.manage'
} as const;

type ValueOf<T> = T[keyof T];
export type AdminSection = ValueOf<typeof ADMIN_SECTION>;
export type AdminPermission = ValueOf<typeof ADMIN_PERMISSION>;

export const ADMIN_ROLE = {
  SuperAdmin: 'super_admin',
  Verifier: 'verifier',
  Mediator: 'mediator',
  Moderator: 'moderator',
  Analyst: 'analyst'
} as const;

export type AdminRole = ValueOf<typeof ADMIN_ROLE>;

export interface AdminRoleConfig {
  label: string;
  description: string;
  /** Sidebar sections, in order. */
  sections: AdminSection[];
  permissions: AdminPermission[];
}

const ALL_SECTIONS = Object.values(ADMIN_SECTION);
const ALL_PERMISSIONS = Object.values(ADMIN_PERMISSION);

export const ADMIN_ROLES: Record<AdminRole, AdminRoleConfig> = {
  super_admin: {
    label: 'Super admin',
    description: 'Everything, including taking over claimed items and managing other admins.',
    sections: ALL_SECTIONS,
    permissions: ALL_PERMISSIONS
  },
  verifier: {
    label: 'Verifier',
    description: 'Reviews vendor documents and approves verification tiers. Runs bulk vendor imports for partner associations.',
    sections: [ADMIN_SECTION.Verification, ADMIN_SECTION.BulkTools],
    permissions: [ADMIN_PERMISSION.VerificationReview, ADMIN_PERMISSION.VerificationDecide, ADMIN_PERMISSION.RevealIdNumber, ADMIN_PERMISSION.BulkImport]
  },
  mediator: {
    label: 'Support/Mediator',
    description: 'Mediates disputes between customers and vendors and decides the outcome. Follows up with at-risk vendors.',
    sections: [ADMIN_SECTION.Disputes, ADMIN_SECTION.Outreach],
    permissions: [ADMIN_PERMISSION.DisputeMediate, ADMIN_PERMISSION.DisputeResolve, ADMIN_PERMISSION.VendorOutreach]
  },
  moderator: {
    label: 'Moderator',
    description: 'Reviews photos, reviews and catalogue content, and handles appeals.',
    sections: [ADMIN_SECTION.Moderation],
    permissions: [ADMIN_PERMISSION.ModerationReview, ADMIN_PERMISSION.ModerationSuspend]
  },
  analyst: {
    label: 'Analyst',
    description: 'Figures (including response times and churn) and the audit log. Can nudge at-risk vendors, but can’t act on any queue.',
    sections: [ADMIN_SECTION.Analytics, ADMIN_SECTION.Audit],
    permissions: [ADMIN_PERMISSION.ViewAnalytics, ADMIN_PERMISSION.VendorOutreach]
  }
};

export const roleCan = (role: AdminRole, permission: AdminPermission) => ADMIN_ROLES[role].permissions.includes(permission);
export const roleSees = (role: AdminRole, section: AdminSection) => ADMIN_ROLES[role].sections.includes(section);
export const isAdminRole = (v: unknown): v is AdminRole => typeof v === 'string' && v in ADMIN_ROLES;

/** Short wording for each permission, for the admin detail view. */
export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  'verification.review': 'Review verification applications',
  'verification.decide': 'Approve or reject verification',
  'verification.reveal_id': 'See full ID numbers (logged)',
  'disputes.mediate': 'Mediate disputes',
  'disputes.resolve': 'Decide dispute outcomes',
  'moderation.review': 'Moderate content and appeals',
  'moderation.suspend': 'Suspend vendors',
  'claims.override': 'Take over claimed items',
  'analytics.view': 'View analytics',
  'vendors.outreach': 'Vendor outreach',
  'vendors.bulk_import': 'Bulk vendor imports',
  'admins.manage': 'Manage admins'
};
