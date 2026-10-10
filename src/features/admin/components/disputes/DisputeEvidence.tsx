import { format } from 'date-fns';
import { MessageSquareIcon } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { DISPUTE_OUTCOME_LABELS, DISPUTE_REASON_LABELS } from '../../../jobs/constants';
import { JobPhotos } from '../../../jobs/components/JobPhotos';
import { formatNaira } from '../../../../utils/format';
import { DeadlineBadge } from '../DeadlineBadge';
import type { DisputeDetail } from '../../services/disputeService';

/** The claim, evidence from both sides, and the mediation thread with each party's response deadline. */
export function DisputeEvidence({ d }: {d: DisputeDetail;}) {
  const subjectDispute = (d.job ?? d.order)?.dispute;
  const nameOf = (party: string) => party === 'customer' ? d.summary.customerName : party === 'vendor' ? d.summary.vendorName : 'Gwani';

  return (
    <div className="space-y-3">
      <section aria-labelledby="claim-heading" className="rounded-2xl border border-clay/40 bg-clay-soft p-4">
        <h3 id="claim-heading" className="text-xs font-bold uppercase tracking-wider text-clay-dark">The claim</h3>
        {subjectDispute &&
        <>
            <p className="mt-1 font-bold text-ink">{DISPUTE_REASON_LABELS[subjectDispute.reason]}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-ink">“{subjectDispute.details}”</p>
            <p className="mt-2 text-xs text-muted">
              Reported by {d.summary.customerName} on {format(new Date(subjectDispute.at), 'd MMM yyyy, h:mm a')}
            </p>
            {subjectDispute.resolution &&
          <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm">
                <strong>{DISPUTE_OUTCOME_LABELS[subjectDispute.resolution.outcome]}</strong>
                {subjectDispute.resolution.refundAmount > 0 && ` · ${formatNaira(subjectDispute.resolution.refundAmount)} refunded`}
                {subjectDispute.resolution.reason && <span className="mt-1 block text-muted">{subjectDispute.resolution.reason}</span>}
              </p>
          }
          </>
        }
      </section>

      <section aria-labelledby="deadlines-heading" className="rounded-2xl border border-line bg-white p-4">
        <h3 id="deadlines-heading" className="text-xs font-bold uppercase tracking-wider text-muted">Response deadlines</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <DeadlineBadge deadline={d.dispute.deadlines.vendor} party={d.summary.vendorName} />
          <DeadlineBadge deadline={d.dispute.deadlines.customer} party={d.summary.customerName} />
        </div>
      </section>

      <section aria-labelledby="evidence-heading" className="rounded-2xl border border-line bg-white p-4">
        <h3 id="evidence-heading" className="text-xs font-bold uppercase tracking-wider text-muted">Evidence from both sides</h3>
        <ol className="mt-2 space-y-3">
          {d.dispute.evidence.map((e) =>
          <li key={e.id} className="rounded-xl border border-line p-3">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={e.party === 'customer' ? 'info' : 'warning'}>{e.party === 'customer' ? 'Customer' : 'Vendor'}</Badge>
                <span className="font-bold">{nameOf(e.party)}</span>
                <span className="text-xs text-muted">{e.kind === 'claim' ? 'Claim' : 'Response'} · {format(new Date(e.at), 'd MMM, h:mm a')}</span>
              </p>
              <p className="mt-1 text-sm text-ink">{e.text}</p>
              {e.attachments.length > 0 &&
            <div className="mt-2">
                  <JobPhotos photos={e.attachments} label={`Photos from ${nameOf(e.party)}`} />
                </div>
            }
            </li>
          )}
        </ol>
      </section>

      <section aria-labelledby="mediation-heading" className="rounded-2xl border border-line bg-white p-4">
        <h3 id="mediation-heading" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
          <MessageSquareIcon className="h-4 w-4" aria-hidden="true" />
          Mediation messages
        </h3>
        {d.dispute.messages.length === 0 ?
        <p className="mt-2 text-sm text-muted">No messages yet.</p> :

        <ol className="mt-2 space-y-2 text-sm">
            {d.dispute.messages.map((m) =>
          <li key={m.id} className={`rounded-xl px-3 py-2 ${m.from === 'mediator' ? 'bg-[#E3EEEC]' : 'bg-sand'}`}>
                <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
                  {m.from === 'mediator' ? `${m.authorName} (Gwani) → ${m.to === 'both' ? 'both parties' : nameOf(m.to)}` : nameOf(m.from)}
                  <span className="font-normal">{format(new Date(m.at), 'd MMM, h:mm a')}</span>
                  {m.kind === 'evidence_request' && <Badge tone="warning">Evidence request</Badge>}
                </p>
                <p className="text-ink">{m.body}</p>
              </li>
          )}
          </ol>
        }
      </section>
    </div>);

}
