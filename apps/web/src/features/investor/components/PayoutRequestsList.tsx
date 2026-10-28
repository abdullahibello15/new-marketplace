import { format } from 'date-fns';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Price } from '../../../components/ui/Price';
import { MOCK_INVESTOR_CONFIG } from '../config';
import { PAYOUT_REQUEST_STATUS, PAYOUT_REQUEST_STATUS_META } from '../constants';
import type { PayoutRequest } from '../types';

interface PayoutRequestsListProps {
  requests: PayoutRequest[];
  approving: boolean;
  onApproveNow: (id: string) => void;
}

/** Every payout request with its status. Pending ones can be approved straight away in the demo. */
export function PayoutRequestsList({ requests, approving, onApproveNow }: PayoutRequestsListProps) {
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
      {requests.map((r) => {
        const meta = PAYOUT_REQUEST_STATUS_META[r.status];
        const pending = r.status === PAYOUT_REQUEST_STATUS.Pending;
        return (
          <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                <Price amount={r.amount} />
                <Badge tone={meta.tone} dot>
                  {meta.label}
                </Badge>
              </p>
              <p className="text-sm text-muted">
                {r.id} · requested {format(new Date(r.requestedAt), 'd MMM yyyy, h:mm a')} · to {r.payoutAccount}
                {r.decidedAt && !pending && ` · ${r.status === PAYOUT_REQUEST_STATUS.Approved ? 'paid' : 'decided'} ${format(new Date(r.decidedAt), 'd MMM yyyy')}`}
              </p>
              {r.note && <p className="text-sm text-clay-dark">{r.note}</p>}
              {pending && <p className="text-xs text-muted">Usually approved within a working day (demo: about {MOCK_INVESTOR_CONFIG.approvalDelaySeconds} seconds).</p>}
            </div>
            {pending && MOCK_INVESTOR_CONFIG.showDemoControls &&
            <Button variant="secondary" size="sm" loading={approving} onClick={() => onApproveNow(r.id)}>
                Approve now (demo)
              </Button>
            }
          </li>);

      })}
    </ul>);

}
