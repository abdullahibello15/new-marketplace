import { Badge } from '../../../../components/ui/Badge';
import { ADMIN_ROLES, type AdminRole } from '../../config/roles';
import { ADMIN_ROLE_TONE, ADMIN_STATUS_META } from '../../constants';
import type { AdminStatus } from '../../types';

export function AdminRoleBadge({ role }: {role: AdminRole;}) {
  return <Badge tone={ADMIN_ROLE_TONE[role]}>{ADMIN_ROLES[role].label}</Badge>;
}

export function AdminStatusBadge({ status }: {status: AdminStatus;}) {
  const meta = ADMIN_STATUS_META[status];
  return <Badge tone={meta.tone} dot>{meta.label}</Badge>;
}
