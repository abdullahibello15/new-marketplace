import { useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ADMIN_ROUTES, DISPUTE_CASE_STATUS_META } from '../constants';
import { AuditTrail } from '../components/AuditTrail';
import { DecisionPanel } from '../components/disputes/DecisionPanel';
import { DisputeEvidence } from '../components/disputes/DisputeEvidence';
import { DisputeThread } from '../components/disputes/DisputeThread';
import { useDisputeWorkspace } from '../hooks/useDisputeWorkspace';

/**
 * /admin/disputes/:id — the dispute workspace in three parts: the full job or order thread (read-only),
 * the claim and evidence from both sides, and the mediator's decision panel. Stacked on small screens.
 */
export function DisputeDetailSection() {
  const { id = '' } = useParams();
  const w = useDisputeWorkspace(id);
  const d = w.data;

  function renderBody() {
    if (w.status === 'error' && !d) return <ErrorState title="Dispute not found" message={w.error ?? ''} onRetry={w.reload} />;
    if (!d) return <LoadingState label="Loading dispute" rows={3} rowClassName="h-48" />;
    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
        <section aria-labelledby="thread-col" className="min-w-0">
          <h2 id="thread-col" className="mb-2 text-sm font-extrabold text-ink">{d.job ? 'Job' : 'Order'} thread</h2>
          <DisputeThread d={d} />
        </section>
        <section aria-labelledby="evidence-col" className="min-w-0">
          <h2 id="evidence-col" className="mb-2 text-sm font-extrabold text-ink">Claim and evidence</h2>
          <DisputeEvidence d={d} />
        </section>
        <section aria-labelledby="decision-col" className="min-w-0 space-y-3 xl:sticky xl:top-6 xl:self-start">
          <h2 id="decision-col" className="mb-2 text-sm font-extrabold text-ink">Decision</h2>
          <DecisionPanel
            d={d}
            busy={w.busy}
            onTake={() => void w.take()}
            onMessage={w.message}
            onRequestEvidence={w.requestEvidence}
            onNote={w.addNote}
            onResolve={w.resolve} />

          <AuditTrail type="dispute" id={d.summary.id} refreshKey={w.version} />
        </section>
      </div>);

  }

  return (
    <>
      <PageHeader
        title={d ? d.summary.title : 'Dispute'}
        subtitle={d ? `${d.summary.customerName} vs ${d.summary.vendorName}` : undefined}
        backTo={{ to: ADMIN_ROUTES.disputes, label: 'Disputes' }}
        action={d ? <Badge tone={DISPUTE_CASE_STATUS_META[d.summary.status].tone} dot>{DISPUTE_CASE_STATUS_META[d.summary.status].label}</Badge> : undefined} />

      <div className="mx-auto max-w-[1400px] px-5 py-6 lg:px-10 lg:py-8">{renderBody()}</div>
    </>);

}
