import { useState } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { BellRingIcon, FlagIcon, MailIcon } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../hooks/useToast';
import { ADMIN_PERMISSION } from '../../config/roles';
import { useAdminSession } from '../../hooks/useAdminSession';
import { flagForOutreach, flagForSlaReview, sendReengagement, sendSlaReminder } from '../../services/outreachService';
import { formatMinutes } from './chartUtils';
import type { AuditEntry } from '../../types';
import type { ChurnRiskRow, ChurnRiskSignal, OutreachMark, SlaVendorRow } from '../../services/analyticsService';

/*
 * The two "at risk" lists (response times and churn) with their outreach actions. Shared by the analytics
 * tabs (Analyst, Super admin) and the Vendor outreach page (Support). Actions show only to roles allowed
 * to take them; each one is audited, and what's been done shows under the vendor's name.
 */

const SIGNAL_LABELS: Record<ChurnRiskSignal, {label: string;tone: 'warning' | 'danger' | 'info';}> = {
  grace: { label: 'Grace period', tone: 'danger' },
  activity: { label: 'Falling activity', tone: 'warning' },
  rating: { label: 'Declining rating', tone: 'info' }
};

function Marks({ marks }: {marks: OutreachMark[];}) {
  if (marks.length === 0) return null;
  const latest = marks[0];
  return (
    <p className="mt-0.5 text-xs text-muted">
      {latest.label} {formatDistanceToNowStrict(new Date(latest.at), { addSuffix: true })} by {latest.by}
      {marks.length > 1 && ` · ${marks.length - 1} earlier`}
    </p>);

}

interface ActionSpec {
  label: string;
  icon: typeof MailIcon;
  run: () => Promise<AuditEntry>;
  done: string;
}

/** Action buttons for one vendor; adds the audit entry to the vendor's marks when done. */
function RowActions({ actions, onDone }: {actions: ActionSpec[];onDone: (mark: OutreachMark) => void;}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  async function run(a: ActionSpec) {
    setBusy(a.label);
    try {
      const entry = await a.run();
      onDone({ action: entry.action, label: a.done, at: entry.at, by: entry.actor.name });
      toast.success(`${a.done}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'That didn’t work. Try again.');
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {actions.map((a) =>
      <Button key={a.label} variant="outline" size="sm" icon={a.icon} disabled={busy !== null} onClick={() => run(a)}>
          {busy === a.label ? 'Working…' : a.label}
        </Button>
      )}
    </div>);

}

/** Keeps each row's outreach marks up to date after an action, without reloading the figures. */
function useMarks() {
  const [added, setAdded] = useState<Record<string, OutreachMark[]>>({});
  return {
    marksFor: (vendorId: string, base: OutreachMark[]) => [...added[vendorId] ?? [], ...base],
    add: (vendorId: string, mark: OutreachMark) => setAdded((m) => ({ ...m, [vendorId]: [mark, ...m[vendorId] ?? []] }))
  };
}

interface SlaAtRiskListProps {
  rows: SlaVendorRow[];
  /** e.g. "1 Sep – 30 Sep" or "the last 30 days", for the audit details. */
  periodText: string;
  onOpenVendor?: (vendorId: string) => void;
}

/** Vendors with repeated SLA breaches: breaches, compliance, typical reply, and Send reminder / Flag for review. */
export function SlaAtRiskList({ rows, periodText, onOpenVendor }: SlaAtRiskListProps) {
  const { can } = useAdminSession();
  const canAct = can(ADMIN_PERMISSION.VendorOutreach);
  const { marksFor, add } = useMarks();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Vendors at risk on response times</caption>
        <thead className="text-xs font-bold uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="py-1.5 text-left">Vendor</th>
            <th scope="col" className="py-1.5 text-right">Breaches</th>
            <th scope="col" className="py-1.5 text-right">Compliance</th>
            <th scope="col" className="py-1.5 text-right">Median reply</th>
            {canAct && <th scope="col" className="py-1.5 text-right"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const context = `${r.breaches} of ${r.responses} requests breached in ${periodText} (${r.compliance ?? '—'}% compliance)`;
            return (
              <tr key={r.vendorId} className="align-top">
                <th scope="row" className="py-2 pr-2 text-left font-normal">
                  {onOpenVendor ?
                  <button type="button" onClick={() => onOpenVendor(r.vendorId)} className="font-semibold text-pine underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
                      {r.name}
                    </button> :

                  <span className="font-semibold">{r.name}</span>
                  }
                  <p className="text-xs text-muted">{r.categoryLabel} · {r.lga}{r.lastBreachAt && ` · last breach ${format(new Date(r.lastBreachAt), 'd MMM')}`}</p>
                  <Marks marks={marksFor(r.vendorId, r.outreach)} />
                </th>
                <td className="py-2 text-right font-mono font-bold tabular-nums text-clay-dark">{r.breaches}</td>
                <td className="py-2 text-right font-mono tabular-nums">{r.compliance === null ? '—' : `${r.compliance}%`}</td>
                <td className="py-2 text-right font-mono tabular-nums">{formatMinutes(r.medianMinutes)}</td>
                {canAct &&
                <td className="py-2 pl-2">
                    <RowActions
                    onDone={(m) => add(r.vendorId, m)}
                    actions={[
                    { label: 'Send reminder', icon: BellRingIcon, done: 'Reminder sent', run: () => sendSlaReminder(r.vendorId, context) },
                    { label: 'Flag for review', icon: FlagIcon, done: 'Flagged for review', run: () => flagForSlaReview(r.vendorId, context) }]
                    } />

                  </td>
                }
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

}

/** Vendors likely to churn, with why, and Send re-engagement message / Flag for outreach. */
export function ChurnAtRiskList({ rows }: {rows: ChurnRiskRow[];}) {
  const { can } = useAdminSession();
  const canAct = can(ADMIN_PERMISSION.VendorOutreach);
  const { marksFor, add } = useMarks();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Vendors at risk of churning</caption>
        <thead className="text-xs font-bold uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="py-1.5 text-left">Vendor</th>
            <th scope="col" className="py-1.5 text-left">Reason</th>
            {canAct && <th scope="col" className="py-1.5 text-right"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const context = r.signals.map((s) => s.text).join('; ');
            return (
              <tr key={r.vendorId} className="align-top">
                <th scope="row" className="py-2 pr-2 text-left font-normal">
                  <span className="font-semibold">{r.name}</span>
                  <p className="text-xs text-muted">{r.categoryLabel} · {r.lga} · {r.planLabel}</p>
                  <Marks marks={marksFor(r.vendorId, r.outreach)} />
                </th>
                <td className="py-2 pr-2">
                  <ul className="space-y-1">
                    {r.signals.map((s) =>
                    <li key={s.signal}>
                        <Badge tone={SIGNAL_LABELS[s.signal].tone}>{SIGNAL_LABELS[s.signal].label}</Badge>
                        <span className="ml-2 text-xs text-muted">{s.text}</span>
                      </li>
                    )}
                  </ul>
                </td>
                {canAct &&
                <td className="py-2 pl-2">
                    <RowActions
                    onDone={(m) => add(r.vendorId, m)}
                    actions={[
                    { label: 'Send re-engagement message', icon: MailIcon, done: 'Re-engagement message sent', run: () => sendReengagement(r.vendorId, context) },
                    { label: 'Flag for outreach', icon: FlagIcon, done: 'Flagged for outreach', run: () => flagForOutreach(r.vendorId, context) }]
                    } />

                  </td>
                }
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

}
