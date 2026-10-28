import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { documentTypeLabel, moderationKindLabel, tierExplanation, tierLabel, verificationStatusLabel } from '../../../i18n/labels';
import { formatDate as format } from '../../../utils/format';
import { AlertTriangleIcon, FileCheck2Icon, PauseCircleIcon, UploadIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { VerificationBadge } from '../../../components/VerificationBadge';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { findVerificationTier } from '../../../data/verificationTiers';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { ReasonDialog } from '../../jobs/components/ReasonDialog';
import { DOCUMENT_TYPE, DOCUMENT_TYPE_LABELS, MODERATION_KIND_LABELS, VERIFICATION_STATUS, VERIFICATION_STATUS_META } from '../../admin/constants';
import { appealRemoval, getMyModerationNotices } from '../../admin/services/moderationService';
import { getMyVerification, resubmitDocuments } from '../../admin/services/verificationService';
import type { DocumentType } from '../../admin/types';
import { useCurrentVendor } from '../../auth/hooks/useCurrentVendor';


/**
 * /pro/verification — the vendor's verification (and what Gwani asked for, with uploads to resubmit),
 * warnings or a suspension, and content Gwani removed with the reason and an appeal.
 */
export function VerificationStandingSection() {
  const { t } = useTranslation('vendor');
  const { vendorId: VENDOR_ID } = useCurrentVendor();
  const toast = useToast();
  const loadVerification = useCallback(() => getMyVerification(VENDOR_ID), [VENDOR_ID]);
  const loadNotices = useCallback(() => getMyModerationNotices(VENDOR_ID), [VENDOR_ID]);
  const verification = useAsyncData(loadVerification);
  const notices = useAsyncData(loadNotices);
  const [files, setFiles] = useState<Partial<Record<DocumentType, string>>>({});
  const [uploading, setUploading] = useState(false);
  const [appealing, setAppealing] = useState<string | null>(null);

  const app = verification.data?.application ?? null;
  const canResubmit = app?.status === VERIFICATION_STATUS.MoreInfo || app?.status === VERIFICATION_STATUS.Rejected;
  // After "more info", the documents Gwani asked for; after a rejection, any document.
  const uploadTypes: DocumentType[] = app?.status === VERIFICATION_STATUS.MoreInfo && app.decision?.documentsNeeded.length ? app.decision.documentsNeeded : Object.values(DOCUMENT_TYPE);
  const chosen = Object.entries(files).filter(([, name]) => name) as [DocumentType, string][];

  async function submit() {
    setUploading(true);
    try {
      await resubmitDocuments(VENDOR_ID, chosen.map(([type, fileName]) => ({ type, fileName })));
      toast.success(t('verification.toastSent'));
      setFiles({});
      verification.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  function renderVerification() {
    if (verification.status === 'error' && !verification.data) return <ErrorState message={verification.error ?? ''} onRetry={verification.reload} />;
    if (!verification.data) return <LoadingState label={t('verification.loading')} rows={1} rowClassName="h-40" />;
    const { tier } = verification.data;
    return (
      <section aria-labelledby="verif-heading" className="space-y-3 rounded-2xl border border-line bg-white p-4 lg:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="verif-heading" className="flex-1 font-bold text-ink">{t('verification.title')}</h2>
          <VerificationBadge verification={tier} />
        </div>
        <p className="text-sm text-muted">{tierExplanation(tier, findVerificationTier(tier)?.explanation)}</p>
        {app ?
        <div className="rounded-xl bg-sand p-3 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{t('verification.latest', { tier: tierLabel(app.requestedTier, findVerificationTier(app.requestedTier)?.label) })}</span>
              <Badge tone={VERIFICATION_STATUS_META[app.status].tone} dot>{verificationStatusLabel(app.status, VERIFICATION_STATUS_META[app.status].label)}</Badge>
            </p>
            <p className="mt-1 text-muted">{t('verification.submitted', { date: format(app.submittedAt, 'd MMM yyyy') })}{app.resubmittedAt && ` · ${t('verification.added', { date: format(app.resubmittedAt, 'd MMM') })}`}</p>
            {app.decision?.message &&
          <p className="mt-2 text-ink">
                <strong>{app.decision.outcome === 'rejected' ? t('verification.reason') : t('verification.gwaniSays')} </strong>
                {app.decision.message}
              </p>
          }
          </div> :

        <p className="text-sm text-muted">{t('verification.notApplied')}</p>
        }

        {canResubmit &&
        <form
          className="space-y-3 rounded-xl border border-mustard bg-[#FBF3DC] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}>

            <h3 className="flex items-center gap-2 font-bold">
              <UploadIcon className="h-4 w-4" aria-hidden="true" /> {t('verification.upload')}
            </h3>
            <p className="text-xs text-muted">{t('verification.uploadHint')}</p>
            {uploadTypes.map((type) =>
          <div key={type}>
                <label htmlFor={`up-${type}`} className="block text-sm font-semibold">{documentTypeLabel(type, DOCUMENT_TYPE_LABELS[type])}</label>
                <input
              id={`up-${type}`}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFiles((f) => ({ ...f, [type]: e.target.files?.[0]?.name ?? '' }))}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:font-semibold" />

              </div>
          )}
            <Button type="submit" loading={uploading} disabled={chosen.length === 0}>
              {chosen.length ? t('verification.send', { count: chosen.length }) : t('verification.sendNone')}
            </Button>
          </form>
        }
      </section>);

  }

  function renderNotices() {
    if (notices.status === 'error' && !notices.data) return <ErrorState message={notices.error ?? ''} onRetry={notices.reload} />;
    if (!notices.data) return <LoadingState label={t('verification.loadingStanding')} rows={1} rowClassName="h-32" />;
    const { suspension, warnings, removed } = notices.data;
    return (
      <div className="space-y-4">
        {suspension &&
        <section role="alert" className="flex gap-3 rounded-2xl bg-clay-dark p-4 text-white">
            <PauseCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-bold">{t('verification.suspendedTitle')}</h2>
              <p className="mt-1 text-sm text-white/90">
                {t('verification.suspendedText', { reason: suspension.reason })}
              </p>
            </div>
          </section>
        }

        <section aria-labelledby="warnings-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
          <h2 id="warnings-heading" className="font-bold text-ink">{t('verification.warnings')}</h2>
          {warnings.length === 0 ?
          <p className="mt-1 text-sm text-muted">{t('verification.noWarnings')}</p> :

          <ul className="mt-2 space-y-2">
              {warnings.map((w) =>
            <li key={w.id} className="flex gap-2 rounded-xl bg-[#FBF3DC] px-3 py-2 text-sm">
                  <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-mustard-dark" aria-hidden="true" />
                  <span>
                    {w.reason} <span className="text-muted">· {format(w.at, 'd MMM yyyy')}</span>
                  </span>
                </li>
            )}
            </ul>
          }
        </section>

        <section aria-labelledby="removed-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
          <h2 id="removed-heading" className="font-bold text-ink">{t('verification.removedTitle')}</h2>
          {removed.length === 0 ?
          <p className="mt-1 text-sm text-muted">{t('verification.nothingRemoved')}</p> :

          <ul className="mt-2 space-y-3">
              {removed.map((item) =>
            <li key={item.id} className="flex flex-col gap-3 rounded-xl border border-line p-3 sm:flex-row">
                  {item.content.imageUrl && <img src={item.content.imageUrl} alt="" className="h-20 w-full rounded-lg object-cover sm:w-28" />}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-bold">
                      {moderationKindLabel(item.kind, MODERATION_KIND_LABELS[item.kind])}
                      {item.content.title && `: ${item.content.title}`}
                    </p>
                    {item.decision?.reason && <p className="mt-0.5">{t('verification.reason')} {item.decision.reason}</p>}
                    {item.decision && <p className="text-xs text-muted">{t('verification.removedOn', { date: format(item.decision.at, 'd MMM yyyy') })}</p>}
                    {item.appeal ?
                <p className="mt-2">
                        <Badge tone={item.appeal.status === 'pending' ? 'warning' : item.appeal.status === 'overturned' ? 'success' : 'neutral'}>
                          {item.appeal.status === 'pending' ? t('verification.appealPending') : item.appeal.status === 'overturned' ? t('verification.appealAccepted') : t('verification.appealDeclined')}
                        </Badge>
                      </p> :

                <Button size="sm" variant="outline" className="mt-2" onClick={() => setAppealing(item.id)}>
                        {t('verification.appeal')}
                      </Button>
                }
                  </div>
                </li>
            )}
            </ul>
          }
        </section>
      </div>);

  }

  return (
    <>
      <PageHeader title={t('verification.pageTitle')} subtitle={t('verification.pageSubtitle')} />
      <PageContainer width="narrow" className="space-y-5">
        {renderVerification()}
        {renderNotices()}
        <p className="flex items-center gap-2 text-xs text-muted">
          <FileCheck2Icon className="h-4 w-4" aria-hidden="true" />
          {t('verification.footer')}
        </p>
      </PageContainer>
      <ReasonDialog
        open={appealing !== null}
        title={t('verification.appealTitle')}
        description={t('verification.appealText')}
        reasonLabel={t('verification.appealLabel')}
        placeholder={t('verification.appealPlaceholder')}
        confirmLabel={t('verification.appealSend')}
        required
        onConfirm={async (message) => {
          if (!appealing) return false;
          try {
            await appealRemoval(VENDOR_ID, appealing, message);
            toast.success(t('verification.toastAppeal'));
            setAppealing(null);
            notices.reload();
            return true;
          } catch (e) {
            toast.error(errorMessage(e));
            return false;
          }
        }}
        onCancel={() => setAppealing(null)} />

    </>);

}
