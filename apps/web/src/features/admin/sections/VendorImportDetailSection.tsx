import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { CopyIcon, DownloadIcon, SendIcon, Undo2Icon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { ImportStatusChip, type ImportRowTone } from '../../../components/vendor/ImportStatus';
import { field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { csvWithBom, downloadText } from '../../../utils/spreadsheetImport';
import { formatLocalPhone } from '../../../utils/phone';
import { planById } from '../../vendor-dashboard/plans';
import { IMPORT_TIER_OPTIONS, INVITE_METHOD_LABELS } from '../config/bulkImport';
import { ADMIN_ROUTES } from '../constants';
import { getVendorImport, resendImportInvite, undoVendorImport } from '../services/vendorImportService';
import { IMPORT_STATUS_META } from '../components/bulk/importStatus';
import type { InviteChannel, InviteStatus } from '../../profile-claim/types';
import type { ImportRowOutcome, VendorImportDetailRow } from '../bulk/types';

const OUTCOME_TONE: Record<ImportRowOutcome, ImportRowTone> = { created: 'ready', linked: 'ready', skipped: 'skipped', failed: 'invalid' };
const OUTCOME_LABEL: Record<ImportRowOutcome, string> = { created: 'Created', linked: 'Linked', skipped: 'Skipped', failed: 'Failed' };
const INVITE_LABEL: Record<InviteStatus, {label: string;tone: 'success' | 'warning' | 'neutral';}> = {
  invited: { label: 'Invited, not claimed', tone: 'warning' },
  claimed: { label: 'Claimed', tone: 'success' },
  revoked: { label: 'Withdrawn', tone: 'neutral' }
};

type Show = 'all' | 'unclaimed' | 'claimed' | 'problems';

function ResendButtons({ row, onSend }: {row: VendorImportDetailRow;onSend: (channel: InviteChannel) => Promise<void>;}) {
  const [busy, setBusy] = useState<InviteChannel | null>(null);
  const toast = useToast();
  const send = async (channel: InviteChannel) => {
    setBusy(channel);
    try {
      await onSend(channel);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'That didn’t work.');
    } finally {
      setBusy(null);
    }
  };
  const link = row.invite ? `${window.location.origin}${row.invite.link}` : '';
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button variant="outline" size="sm" icon={SendIcon} disabled={busy !== null} onClick={() => send('sms')}>{busy === 'sms' ? 'Sending…' : 'Resend SMS'}</Button>
      {row.email && <Button variant="outline" size="sm" icon={SendIcon} disabled={busy !== null} onClick={() => send('email')}>{busy === 'email' ? 'Sending…' : 'Resend email'}</Button>}
      <Button
        variant="ghost"
        size="sm"
        icon={CopyIcon}
        onClick={() => navigator.clipboard?.writeText(link).then(() => toast.success('Claim link copied.'), () => toast.error('Couldn’t copy. The link is: ' + link))}
        aria-label={`Copy claim link for ${row.businessName}`}>

        Copy link
      </Button>
    </div>);

}

/** /admin/bulk/imports/:importId — one import's rows, who has and hasn't claimed, resend, and Undo. */
export function VendorImportDetailSection() {
  const { importId = '' } = useParams();
  const load = useCallback(() => getVendorImport(importId), [importId]);
  const { data, status, error, reload } = useAsyncData(load);
  const [show, setShow] = useState<Show>('all');
  const [undoOpen, setUndoOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [undoing, setUndoing] = useState(false);
  const [undoError, setUndoError] = useState('');
  const toast = useToast();

  async function undo() {
    setUndoing(true);
    setUndoError('');
    try {
      const r = await undoVendorImport(importId, reason);
      toast.success(`Withdrew ${r.undo?.removed ?? 0} unclaimed ${r.undo?.removed === 1 ? 'profile' : 'profiles'}.`);
      setUndoOpen(false);
      setReason('');
      reload();
    } catch (e) {
      setUndoError(e instanceof Error ? e.message : 'That didn’t work.');
    } finally {
      setUndoing(false);
    }
  }

  function body() {
    if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (!data) return <LoadingState label="Loading the import" />;
    const { record } = data;
    const rows = data.rows.filter((r) =>
    show === 'all' ||
    show === 'unclaimed' && r.invite?.status === 'invited' ||
    show === 'claimed' && r.invite?.status === 'claimed' ||
    show === 'problems' && (r.outcome === 'failed' || r.outcome === 'skipped')
    );
    const csv = () =>
    downloadText(
      `gwani-import-${record.id}.csv`,
      csvWithBom([
      ['row', 'full_name', 'business_name', 'phone', 'email', 'result', 'reason', 'vendor_id', 'invitation', 'claimed_at'],
      ...data.rows.map((r) => [r.line, r.fullName, r.businessName, formatLocalPhone(r.phone), r.email ?? '', r.outcome, r.reason ?? '', r.vendorId ?? '', r.invite ? INVITE_LABEL[r.invite.status].label : '', r.invite?.claimedAt ?? ''])]
      )
    );

    return (
      <div className="space-y-4">
        <section className="grid gap-4 rounded-2xl border border-line bg-white p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:p-5">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Partner</dt><dd className="font-semibold">{record.partner.name}</dd></div>
            <div><dt className="text-muted">Run by</dt><dd className="font-semibold">{record.by.name}, {format(new Date(record.createdAt), 'd MMM yyyy, HH:mm')}</dd></div>
            <div><dt className="text-muted">File</dt><dd className="font-semibold">{record.fileName} <span className="font-normal text-muted">(not kept)</span></dd></div>
            <div><dt className="text-muted">Status</dt><dd><Badge tone={IMPORT_STATUS_META[record.status].tone}>{IMPORT_STATUS_META[record.status].label}</Badge></dd></div>
            <div><dt className="text-muted">Plan · starts</dt><dd className="font-semibold">{planById(record.settings.planId).name} · {format(new Date(`${record.settings.startDate}T00:00:00`), 'd MMM yyyy')}</dd></div>
            <div><dt className="text-muted">Tier · invitations</dt><dd className="font-semibold">{IMPORT_TIER_OPTIONS.find((t) => t.id === record.settings.tier)?.label} · {INVITE_METHOD_LABELS[record.settings.invite]}</dd></div>
            {record.undo &&
            <div className="sm:col-span-2"><dt className="text-muted">Undone</dt><dd>{format(new Date(record.undo.at), 'd MMM yyyy, HH:mm')} by {record.undo.by}: “{record.undo.reason}” ({record.undo.removed} withdrawn)</dd></div>
            }
          </dl>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(['created', 'linked', 'skipped', 'failed'] as const).map((k) =>
            <div key={k} className="rounded-xl bg-sand px-3 py-2"><p className="text-muted">{OUTCOME_LABEL[k]}</p><p className="text-xl font-extrabold">{record.counts[k]}</p></div>
            )}
            <div className="rounded-xl bg-[#E3EEEC] px-3 py-2"><p className="text-muted">Claimed</p><p className="text-xl font-extrabold text-pine">{data.claimed}</p></div>
            <div className="rounded-xl bg-[#FBEFD2] px-3 py-2"><p className="text-muted">Not claimed</p><p className="text-xl font-extrabold text-mustard-dark">{data.unclaimed}</p></div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <div className="overflow-x-auto">
            <SegmentedControl<Show>
              label="Show"
              options={[{ id: 'all', label: 'All' }, { id: 'unclaimed', label: `Not claimed (${data.unclaimed})` }, { id: 'claimed', label: `Claimed (${data.claimed})` }, { id: 'problems', label: 'Skipped or failed' }]}
              value={show}
              onChange={setShow} />

          </div>
          <span className="flex-1" />
          <Button variant="ghost" size="sm" icon={DownloadIcon} onClick={csv}>CSV</Button>
          <Button variant="danger" size="sm" icon={Undo2Icon} disabled={data.unclaimed === 0 || record.status === 'running'} onClick={() => setUndoOpen(true)}>Undo import</Button>
        </div>

        {rows.length === 0 ?
        <p className="rounded-2xl border border-line bg-white px-4 py-8 text-center text-muted">No rows to show.</p> :

        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[880px] text-left text-sm">
              <caption className="sr-only">Rows in this import</caption>
              <thead className="border-b border-line bg-sand/60 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="w-14 px-4 py-3">Row</th>
                  <th scope="col" className="px-3 py-3">Vendor</th>
                  <th scope="col" className="px-3 py-3">Result</th>
                  <th scope="col" className="px-3 py-3">Profile</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) =>
              <tr key={r.line} className="align-top">
                    <td className="px-4 py-3 tabular-nums text-muted">{r.line}</td>
                    <td className="px-3 py-3">
                      <p className="font-bold">{r.businessName}</p>
                      <p className="text-xs text-muted">{r.fullName} · {formatLocalPhone(r.phone)}{r.email && ` · ${r.email}`}</p>
                    </td>
                    <td className="px-3 py-3">
                      <ImportStatusChip tone={OUTCOME_TONE[r.outcome]} label={OUTCOME_LABEL[r.outcome]} />
                      {r.reason && <p className="mt-1 max-w-xs text-xs text-muted">{r.reason}</p>}
                    </td>
                    <td className="px-3 py-3">
                      {r.invite ?
                  <>
                          <Badge tone={INVITE_LABEL[r.invite.status].tone}>{INVITE_LABEL[r.invite.status].label}</Badge>
                          <p className="mt-1 text-xs text-muted">
                            {r.invite.status === 'claimed' && r.invite.claimedAt ?
                      `Claimed ${format(new Date(r.invite.claimedAt), 'd MMM')}` :
                      r.invite.lastSentAt ?
                      `Last sent ${formatDistanceToNowStrict(new Date(r.invite.lastSentAt), { addSuffix: true })} (${r.invite.sends}×)` :
                      'Not sent yet'}
                          </p>
                        </> :
                  r.outcome === 'linked' ?
                  <span className="text-xs text-muted">Existing vendor, added to the bundle</span> :

                  <span className="text-xs text-muted">—</span>
                  }
                    </td>
                    <td className="px-4 py-3">
                      {r.invite?.status === 'invited' && r.inviteId &&
                  <ResendButtons
                    row={r}
                    onSend={async (channel) => {
                      await resendImportInvite(record.id, r.inviteId as string, channel, window.location.origin);
                      toast.success(`Claim link sent to ${r.businessName} by ${channel === 'sms' ? 'SMS' : 'email'}.`);
                      reload();
                    }} />

                  }
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }

        <Dialog open={undoOpen} onClose={() => setUndoOpen(false)} dismissible={!undoing} title="Undo this import?" description={`Withdraws the ${data.unclaimed} ${data.unclaimed === 1 ? 'profile' : 'profiles'} nobody has claimed yet: their claim links stop working and they come off ${record.partner.name}’s bundle (they weren’t paid for). Claimed profiles and linked existing vendors stay.`}>
          <label htmlFor="undo-reason" className={labelClass}>Reason (required, goes in the audit log)</label>
          <textarea id="undo-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={`${field} ${ok}`} />
          {undoError && <p role="alert" className="mt-2 text-sm font-medium text-clay-dark">{undoError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUndoOpen(false)} disabled={undoing}>Cancel</Button>
            <Button variant="danger" loading={undoing} disabled={reason.trim().length < 5} onClick={undo}>Undo import</Button>
          </div>
        </Dialog>
      </div>);

  }

  return (
    <>
      <PageHeader title="Vendor import" subtitle={data ? `${data.record.partner.name} · ${data.record.fileName}` : undefined} backTo={{ to: ADMIN_ROUTES.bulk, label: 'Bulk tools' }} />
      <PageContainer>{body()}</PageContainer>
    </>);

}
