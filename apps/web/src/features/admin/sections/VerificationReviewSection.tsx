import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle2Icon, FileQuestionIcon, XCircleIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { VerificationBadge } from '../../../components/VerificationBadge';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { useVendors } from '../../../contexts/VendorsContext';
import { findVerificationTier } from '../../../data/verificationTiers';
import { formatTrade } from '../../../utils/format';
import { ReasonDialog } from '../../jobs/components/ReasonDialog';
import { ADMIN_PERMISSION } from '../config/roles';
import { VERIFICATION_REJECT_REASONS } from '../config/policies';
import { ADMIN_ROUTES, DOCUMENT_TYPE_LABELS, VERIFICATION_STATUS, VERIFICATION_STATUS_META } from '../constants';
import { AuditTrail } from '../components/AuditTrail';
import { ClaimBanner } from '../components/ClaimBanner';
import { DocumentChecklist } from '../components/verification/DocumentChecklist';
import { DocumentViewer } from '../components/verification/DocumentViewer';
import { MoreInfoDialog } from '../components/verification/MoreInfoDialog';
import { useAdminSession } from '../hooks/useAdminSession';
import { useApplicationReview } from '../hooks/useApplicationReview';

/** /admin/verification/:id — documents, checklist, notes, and Approve / Reject / Request more info. */
export function VerificationReviewSection() {
  const { id = '' } = useParams();
  const r = useApplicationReview(id);
  const { admin, can } = useAdminSession();
  const vendor = useVendors().getVendor(r.data?.vendorId ?? '');
  const [docIndex, setDocIndex] = useState(0);
  const [dialog, setDialog] = useState<'approve' | 'reject' | 'info' | null>(null);
  const a = r.data;

  function renderBody() {
    if (r.status === 'error' && !a) return <ErrorState title="Application not found" message={r.error ?? ''} onRetry={r.reload} />;
    if (!a || !admin) return <LoadingState label="Loading application" rows={3} rowClassName="h-48" />;
    const open = a.status === VERIFICATION_STATUS.Pending || a.status === VERIFICATION_STATUS.InReview;
    const mine = a.claim?.adminId === admin.id;
    const editable = open && mine && can(ADMIN_PERMISSION.VerificationReview);
    const canDecide = editable && can(ADMIN_PERMISSION.VerificationDecide);
    const doc = a.documents[docIndex] ?? a.documents[0];
    const meta = VERIFICATION_STATUS_META[a.status];
    const failed = a.documents.some((d) => Object.values(r.checksFor(d.id)).includes(false));
    const unchecked = a.documents.some((d) => Object.values(r.checksFor(d.id)).includes(null));

    return (
      <div className="space-y-5">
        {open ?
        <ClaimBanner
          claim={a.claim}
          meId={admin.id}
          noun="application"
          canClaim={can(ADMIN_PERMISSION.VerificationReview)}
          canTakeOver={can(ADMIN_PERMISSION.OverrideClaim)}
          busy={r.busy === 'claim' || r.busy === 'release'}
          onClaim={(takeOver) => void r.claim(takeOver)}
          onRelease={() => void r.release()} /> :


        <div role="status" className="rounded-2xl border border-line bg-white px-4 py-3 text-sm">
            <Badge tone={meta.tone} dot>{meta.label}</Badge>
            {a.decision &&
          <span className="ml-2">
                by {a.decision.by} on {format(new Date(a.decision.at), 'd MMM yyyy')}
                {a.decision.message && <>: “{a.decision.message}”</>}
              </span>
          }
          </div>
        }

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <DocumentViewer documents={a.documents} index={docIndex} onIndexChange={setDocIndex} />
            {doc &&
            <DocumentChecklist
              doc={doc}
              applicantName={a.applicantName}
              checks={r.checksFor(doc.id)}
              disabled={!editable || r.busy === 'save'}
              onChange={(checks) => void r.setChecks(doc.id, checks)}
              revealed={r.revealed[doc.id] ?? null}
              canReveal={can(ADMIN_PERMISSION.RevealIdNumber)}
              revealing={r.busy === `reveal:${doc.id}`}
              onReveal={() => void r.reveal(doc.id)} />

            }
          </div>

          <aside className="space-y-4" aria-label="Vendor and decision">
            <section aria-labelledby="vendor-heading" className="rounded-2xl border border-line bg-white p-4">
              <h2 id="vendor-heading" className="text-xs font-bold uppercase tracking-wider text-muted">Vendor</h2>
              <div className="mt-2 flex items-center gap-3">
                {vendor && <img src={vendor.photo} alt="" className="h-12 w-12 rounded-xl object-cover" />}
                <div className="min-w-0">
                  <p className="font-bold">{a.vendorName}</p>
                  <p className="text-sm text-muted">
                    {a.applicantName}
                    {vendor && <> · {formatTrade(vendor)} · {vendor.lga}</>}
                  </p>
                </div>
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">Current tier</dt>
                  <dd>{vendor ? <VerificationBadge verification={vendor.verification} /> : <VerificationBadge verification={a.currentTier} />}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">Requested tier</dt>
                  <dd><VerificationBadge verification={a.requestedTier} /></dd>
                </div>
                <div>
                  <dt className="sr-only">What this tier means</dt>
                  <dd className="text-xs text-muted">{findVerificationTier(a.requestedTier)?.description}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Submitted</dt>
                  <dd>{format(new Date(a.submittedAt), 'd MMM yyyy, h:mm a')}</dd>
                </div>
                {a.resubmittedAt &&
                <div className="flex justify-between gap-2">
                    <dt className="text-muted">Resubmitted</dt>
                    <dd>{format(new Date(a.resubmittedAt), 'd MMM yyyy, h:mm a')}</dd>
                  </div>
                }
              </dl>
              {vendor &&
              <Link to={`/vendors/${encodeURIComponent(vendor.id)}`} className="mt-3 inline-block text-sm font-bold text-pine hover:underline">
                  Open public profile
                </Link>
              }
              {a.decision?.outcome === 'more_info' &&
              <p className="mt-3 rounded-lg bg-sand px-3 py-2 text-xs">
                  Earlier request: “{a.decision.message}” ({a.decision.documentsNeeded.map((d) => DOCUMENT_TYPE_LABELS[d]).join(', ')})
                </p>
              }
            </section>

            <section aria-labelledby="notes-heading" className="rounded-2xl border border-line bg-white p-4">
              <label id="notes-heading" htmlFor="review-notes" className={labelClass}>
                Reviewer notes (staff only)
              </label>
              <textarea
                id="review-notes"
                rows={4}
                maxLength={2000}
                value={r.notes}
                disabled={!editable}
                onChange={(e) => r.setNotes(e.target.value)}
                className={`${field} ${ok} disabled:bg-sand`} />

              {editable &&
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => void r.saveNotes()} loading={r.busy === 'save'}>
                  Save notes
                </Button>
              }
            </section>

            {open && can(ADMIN_PERMISSION.VerificationDecide) &&
            <section aria-labelledby="decide-heading" className="space-y-2 rounded-2xl border border-line bg-white p-4">
                <h2 id="decide-heading" className="text-xs font-bold uppercase tracking-wider text-muted">Decision</h2>
                {!editable && <p className="text-sm text-muted">Claim the application to decide.</p>}
                {editable && unchecked && <p className="text-xs text-muted">Some checks aren’t done yet.</p>}
                {editable && failed && <p className="text-xs font-semibold text-clay-dark">A check failed: consider rejecting or asking for more information.</p>}
                <Button fullWidth icon={CheckCircle2Icon} disabled={!canDecide} onClick={() => setDialog('approve')}>
                  Approve as {findVerificationTier(a.requestedTier)?.label}
                </Button>
                <Button fullWidth variant="outline" icon={FileQuestionIcon} disabled={!canDecide} onClick={() => setDialog('info')}>
                  Request more info
                </Button>
                <Button fullWidth variant="danger" icon={XCircleIcon} disabled={!canDecide} onClick={() => setDialog('reject')}>
                  Reject
                </Button>
              </section>
            }

            <AuditTrail type="vendor_verification" id={a.id} refreshKey={`${a.status}:${a.claim?.at ?? ''}:${Object.keys(r.revealed).length}`} />
          </aside>
        </div>

        <ConfirmDialog
          open={dialog === 'approve'}
          title={`Approve ${a.vendorName}?`}
          description={`They’ll get the ${findVerificationTier(a.requestedTier)?.label} badge on their profile, cards and in the search filter straight away.${failed ? ' Note: a check is marked as failed.' : ''}`}
          confirmLabel="Approve"
          loading={r.busy === 'approve'}
          onConfirm={async () => {
            if (await r.approve()) setDialog(null);
          }}
          onCancel={() => setDialog(null)} />

        <ReasonDialog
          open={dialog === 'reject'}
          title={`Reject ${a.vendorName}?`}
          description="The vendor sees this reason and can upload new documents."
          reasonLabel="Reason"
          confirmLabel="Reject application"
          presets={VERIFICATION_REJECT_REASONS}
          required
          destructive
          onConfirm={r.reject}
          onCancel={() => setDialog(null)} />

        <MoreInfoDialog open={dialog === 'info'} vendorName={a.vendorName} onConfirm={r.requestInfo} onCancel={() => setDialog(null)} />
      </div>);

  }

  return (
    <>
      <PageHeader
        title={a ? a.vendorName : 'Review application'}
        subtitle={a ? `${a.id} · requests ${findVerificationTier(a.requestedTier)?.label}` : undefined}
        backTo={{ to: ADMIN_ROUTES.verification, label: 'Verification queue' }} />

      <PageContainer>{renderBody()}</PageContainer>
    </>);

}
