import { useTranslation } from 'react-i18next';
import i18n from '../../../../i18n';
import { memberStatusLabel } from '../../../../i18n/labels';
import { formatDate } from '../../../../utils/format';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { ASSOCIATION_MEMBER_STATUS, ASSOCIATION_MEMBER_STATUS_META } from '../../constants';
import type { Association, AssociationMember } from '../../types';

const day = (iso: string) => formatDate(iso, 'd MMM yyyy');

/** What each member's cover means right now. */
function coverText(m: AssociationMember, a: Association): string {
  if (m.status === ASSOCIATION_MEMBER_STATUS.Active) return i18n.t('vendor:association.coveredUntil', { date: day(a.renewsOn) });
  if (m.status === ASSOCIATION_MEMBER_STATUS.PendingPayment) return i18n.t('vendor:association.payBelow');
  if (!m.accessUntil) return i18n.t('vendor:association.removed');
  return i18n.t('vendor:association.removedAccess', { removed: m.removedAt ? day(m.removedAt) : '', until: day(m.accessUntil) });
}

interface AssociationMemberListProps {
  association: Association;
  onRemove: (member: AssociationMember) => void;
}

/** Every member with their status and cover. Removed members stay listed until their access ends. */
export function AssociationMemberList({ association, onRemove }: AssociationMemberListProps) {
  const { t } = useTranslation('vendor');
  if (association.members.length === 0) return <p className="text-sm text-muted">{t('association.noMembers')}</p>;
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
      {association.members.map((m) => {
        const meta = ASSOCIATION_MEMBER_STATUS_META[m.status];
        return (
          <li key={m.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">{m.vendorName}</p>
              <p className="text-sm text-muted">
                {m.contact} · {coverText(m, association)}
              </p>
            </div>
            <Badge tone={meta.tone}>{memberStatusLabel(m.status, meta.label)}</Badge>
            {m.status !== ASSOCIATION_MEMBER_STATUS.Removed &&
            <Button variant="ghost" size="sm" onClick={() => onRemove(m)}>
                {t('common:action.remove')}<span className="sr-only"> {m.vendorName}</span>
              </Button>
            }
          </li>);

      })}
    </ul>);

}
