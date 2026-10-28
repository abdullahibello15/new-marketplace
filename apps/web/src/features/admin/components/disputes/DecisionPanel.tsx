import { useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { errorText, field, label as labelClass, ok, bad } from '../../../../components/vendor/formStyles';
import { formatNaira } from '../../../../utils/format';
import { DISPUTE_OUTCOME, DISPUTE_OUTCOME_LABELS } from '../../../jobs/constants';
import { ADMIN_PERMISSION } from '../../config/roles';
import { DISPUTE_CASE_STATUS } from '../../constants';
import { ClaimBanner } from '../ClaimBanner';
import { useAdminSession } from '../../hooks/useAdminSession';
import type { DisputeOutcome, JobParty } from '../../../jobs/types';
import type { DisputeDetail } from '../../services/disputeService';
import type { PartyHistory } from '../../types';

interface DecisionPanelProps {
  d: DisputeDetail;
  busy: string | null;
  onTake: () => void;
  onMessage: (to: 'customer' | 'vendor' | 'both', body: string) => Promise<boolean>;
  onRequestEvidence: (party: JobParty, body: string) => Promise<boolean>;
  onNote: (body: string) => Promise<boolean>;
  onResolve: (outcome: DisputeOutcome, reason: string, refundAmount?: number) => Promise<boolean>;
}

const OUTCOMES: {id: DisputeOutcome;label: string;hint: string;}[] = [
{ id: DISPUTE_OUTCOME.ReleaseToVendor, label: 'Release escrow to vendor', hint: 'The vendor gets the held money, less commission.' },
{ id: DISPUTE_OUTCOME.RefundCustomer, label: 'Refund the customer in full', hint: 'Everything held goes back to the customer.' },
{ id: DISPUTE_OUTCOME.Split, label: 'Partial refund', hint: 'Part back to the customer, the rest released to the vendor.' },
{ id: DISPUTE_OUTCOME.Dismiss, label: 'Dismiss', hint: 'Back to where it was: the money is held again until confirmed.' }];


function Card({ title, children }: {title: string;children: ReactNode;}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>);

}

function History({ label, h }: {label: string;h: PartyHistory;}) {
  return (
    <div className="rounded-xl bg-sand px-3 py-2 text-sm">
      <p className="font-bold">
        {h.name} <span className="font-normal text-muted">({label})</span>
      </p>
      <p className="text-xs text-muted">
        {h.pastDisputes} other {h.pastDisputes === 1 ? 'dispute' : 'disputes'} · {h.cancellations} {h.cancellations === 1 ? 'cancellation' : 'cancellations'}
        {h.rating && ` · ${h.rating.average.toFixed(1)}★ (${h.rating.count})`} · {h.jobs} jobs, {h.orders} orders
      </p>
    </div>);

}

/** The mediator's side: take it on, see each party's record, talk to them, keep notes, decide. */
export function DecisionPanel({ d, busy, onTake, onMessage, onRequestEvidence, onNote, onResolve }: DecisionPanelProps) {
  const { admin, can } = useAdminSession();
  const [to, setTo] = useState<'customer' | 'vendor' | 'both'>('both');
  const [message, setMessage] = useState('');
  const [evidenceFrom, setEvidenceFrom] = useState<JobParty>('vendor');
  const [evidence, setEvidence] = useState('');
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<DisputeOutcome | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<{amount?: string;reason?: string;outcome?: string;}>({});

  if (!admin) return null;
  const resolved = d.summary.status === DISPUTE_CASE_STATUS.Resolved;
  const assignedElsewhere = !!d.dispute.assignee && d.dispute.assignee.adminId !== admin.id && !can(ADMIN_PERMISSION.OverrideClaim);
  const canAct = can(ADMIN_PERMISSION.DisputeMediate) && !resolved && !assignedElsewhere;
  const total = d.summary.amount;
  const refund = Number(amount.replace(/[^\d]/g, ''));

  function review() {
    const next: typeof errors = {};
    if (!outcome) next.outcome = 'Choose an outcome.';
    if (outcome === DISPUTE_OUTCOME.Split && (!refund || refund <= 0 || refund >= total)) next.amount = `Enter an amount between ₦1 and ${formatNaira(total - 1)}.`;
    if (reason.trim().length < 10) next.reason = 'Write the reason for your decision (at least 10 characters). Both parties will see it.';
    setErrors(next);
    if (Object.keys(next).length === 0) setConfirming(true);
  }

  const summaryText =
  outcome === DISPUTE_OUTCOME.ReleaseToVendor ? `${formatNaira(total)} is released to ${d.summary.vendorName} (less commission).` :
  outcome === DISPUTE_OUTCOME.RefundCustomer ? `${formatNaira(total)} goes back to ${d.summary.customerName}.` :
  outcome === DISPUTE_OUTCOME.Split ? `${formatNaira(refund)} goes back to ${d.summary.customerName}; ${formatNaira(total - refund)} is released to ${d.summary.vendorName}.` :
  `The ${d.summary.subject.kind} goes back to where it was and the money stays held until it’s confirmed.`;

  return (
    <div className="space-y-3">
      {!resolved &&
      <ClaimBanner
        claim={d.dispute.assignee}
        meId={admin.id}
        noun="dispute"
        canClaim={can(ADMIN_PERMISSION.DisputeMediate)}
        canTakeOver={can(ADMIN_PERMISSION.OverrideClaim)}
        busy={busy === 'take'}
        onClaim={onTake}
        expires={false} />

      }

      <Card title="Each party’s record">
        <div className="space-y-2">
          <History label="customer" h={d.parties.customer} />
          <History label="vendor" h={d.parties.vendor} />
        </div>
      </Card>

      {canAct &&
      <>
          <Card title="Message the parties">
            <label htmlFor="msg-to" className="sr-only">Send to</label>
            <select id="msg-to" value={to} onChange={(e) => setTo(e.target.value as typeof to)} className={`${field} ${ok} py-2`}>
              <option value="both">Both parties</option>
              <option value="customer">Customer: {d.summary.customerName}</option>
              <option value="vendor">Vendor: {d.summary.vendorName}</option>
            </select>
            <label htmlFor="msg-body" className="sr-only">Message</label>
            <textarea id="msg-body" rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write to them…" className={`${field} ${ok} mt-2`} />
            <Button size="sm" className="mt-2" loading={busy === 'message'} disabled={!message.trim()} onClick={async () => (await onMessage(to, message)) && setMessage('')}>
              Send message
            </Button>
          </Card>

          <Card title="Request more evidence">
            <label htmlFor="ev-from" className="sr-only">From</label>
            <select id="ev-from" value={evidenceFrom} onChange={(e) => setEvidenceFrom(e.target.value as JobParty)} className={`${field} ${ok} py-2`}>
              <option value="vendor">From the vendor</option>
              <option value="customer">From the customer</option>
            </select>
            <label htmlFor="ev-body" className="sr-only">What you need</label>
            <textarea id="ev-body" rows={3} maxLength={1000} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="e.g. Photos of the finished work" className={`${field} ${ok} mt-2`} />
            <p className="mt-1 text-xs text-muted">Starts a 48-hour response countdown for them.</p>
            <Button
            size="sm"
            variant="outline"
            className="mt-2"
            loading={busy === 'evidence'}
            disabled={evidence.trim().length < 10}
            onClick={async () => (await onRequestEvidence(evidenceFrom, evidence)) && setEvidence('')}>

              Request evidence
            </Button>
          </Card>
        </>
      }

      <Card title="Internal notes (staff only)">
        {d.dispute.notes.length === 0 ?
        <p className="text-sm text-muted">No notes yet.</p> :

        <ol className="space-y-2 text-sm">
            {d.dispute.notes.map((n) =>
          <li key={n.id} className="rounded-lg bg-[#FBF3DC] px-3 py-2">
                <p className="text-xs font-bold text-muted">
                  {n.authorName} · {format(new Date(n.at), 'd MMM, h:mm a')}
                </p>
                <p>{n.body}</p>
              </li>
          )}
          </ol>
        }
        {can(ADMIN_PERMISSION.DisputeMediate) && !assignedElsewhere &&
        <>
            <label htmlFor="note-body" className="sr-only">New note</label>
            <textarea id="note-body" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not visible to the customer or vendor" className={`${field} ${ok} mt-2`} />
            <Button size="sm" variant="secondary" className="mt-2" loading={busy === 'note'} disabled={!note.trim()} onClick={async () => (await onNote(note)) && setNote('')}>
              Add note
            </Button>
          </>
        }
      </Card>

      {!resolved && can(ADMIN_PERMISSION.DisputeResolve) && !assignedElsewhere &&
      <section aria-labelledby="resolve-heading" className="rounded-2xl border-2 border-pine bg-white p-4">
          <h3 id="resolve-heading" className="font-bold text-ink">Resolve</h3>
          <p className="text-xs text-muted">At stake: {formatNaira(total)}</p>
          <fieldset className="mt-2 space-y-2" aria-describedby={errors.outcome ? 'outcome-error' : undefined}>
            <legend className="sr-only">Outcome</legend>
            {OUTCOMES.map((o) =>
          <label key={o.id} className={`flex cursor-pointer gap-2 rounded-xl border p-2.5 text-sm ${outcome === o.id ? 'border-pine bg-[#E3EEEC]' : 'border-line'}`}>
                <input type="radio" name="outcome" className="mt-0.5 accent-pine" checked={outcome === o.id} onChange={() => setOutcome(o.id)} />
                <span>
                  <span className="block font-bold">{o.label}</span>
                  <span className="block text-xs text-muted">{o.hint}</span>
                </span>
              </label>
          )}
          </fieldset>
          {errors.outcome && <p id="outcome-error" className={errorText}>{errors.outcome}</p>}

          {outcome === DISPUTE_OUTCOME.Split &&
        <div className="mt-3">
              <label htmlFor="refund-amount" className={labelClass}>Refund to the customer (₦)</label>
              <input
            id="refund-amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ''))}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? 'refund-error' : 'refund-hint'}
            className={`${field} ${errors.amount ? bad : ok}`} />

              {errors.amount ? <p id="refund-error" className={errorText}>{errors.amount}</p> : <p id="refund-hint" className="mt-1 text-xs text-muted">Between ₦1 and {formatNaira(total - 1)}.</p>}
            </div>
        }

          <label htmlFor="resolve-reason" className={`${labelClass} mt-3`}>Reason (both parties see this)</label>
          <textarea
          id="resolve-reason"
          rows={3}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-invalid={errors.reason ? true : undefined}
          aria-describedby={errors.reason ? 'reason-error' : undefined}
          className={`${field} ${errors.reason ? bad : ok}`} />

          {errors.reason && <p id="reason-error" className={errorText}>{errors.reason}</p>}
          <Button fullWidth className="mt-3" onClick={review}>
            Review decision
          </Button>
        </section>
      }

      <ConfirmDialog
        open={confirming && outcome !== null}
        title={outcome ? DISPUTE_OUTCOME_LABELS[outcome] : ''}
        description={`${summaryText} The escrow ledger and the ${d.summary.subject.kind} status update, and both parties are notified with your reason. This can’t be undone.`}
        confirmLabel="Confirm decision"
        cancelLabel="Go back"
        loading={busy === 'resolve'}
        onConfirm={async () => {
          if (outcome && (await onResolve(outcome, reason, outcome === DISPUTE_OUTCOME.Split ? refund : undefined))) setConfirming(false);
        }}
        onCancel={() => setConfirming(false)} />

    </div>);

}
