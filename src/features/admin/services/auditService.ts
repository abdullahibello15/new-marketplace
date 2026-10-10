import { mockResponse } from '../../../services/mockApi';
import { mockAuditEntries } from '../mock/audit';
import { requireAdmin } from './adminSession';
import type { AdminUser, AuditAction, AuditEntry, AuditTargetType } from '../types';

/*
 * The admin audit log (our backend's side, mocked). Every admin action records who did it, what, to which
 * item, the reason and when. Append-only: nothing here edits or deletes an entry.
 */
let entries: readonly AuditEntry[] = structuredClone(mockAuditEntries);
let nextId = entries.length + 1;

/** Called by the admin services in the same step as the action itself. */
export function recordAudit(
actor: AdminUser,
action: AuditAction,
target: AuditEntry['target'],
{ reason = null, details = null }: {reason?: string | null;details?: string | null;} = {})
: AuditEntry {
  const entry: AuditEntry = {
    id: `aud-${nextId++}`,
    at: new Date().toISOString(),
    actor: { id: actor.id, name: actor.name, role: actor.role },
    action,
    target,
    reason: reason?.trim() || null,
    details
  };
  entries = [entry, ...entries];
  return entry;
}

/** Newest first. */
const newestFirst = (list: readonly AuditEntry[]) => [...list].sort((a, b) => b.at.localeCompare(a.at));

/** GET /admin/audit — the whole log, newest first. Read-only. */
export function listAuditLog(): Promise<AuditEntry[]> {
  return mockResponse(() => {
    requireAdmin();
    return newestFirst(entries);
  }, 300);
}

/** GET /admin/audit?target=… — the entries about one item, for its detail view. */
export function getAuditFor(type: AuditTargetType, id: string): Promise<AuditEntry[]> {
  return mockResponse(() => {
    requireAdmin();
    return newestFirst(entries.filter((e) => e.target.type === type && e.target.id === id));
  }, 200);
}

/** Sync read for other admin services (e.g. analytics). */
export const auditSnapshot = (): readonly AuditEntry[] => entries;
