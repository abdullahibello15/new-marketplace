import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { DownloadIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { formatLocalPhone } from '../../../../utils/phone';
import { csvWithBom, downloadText } from '../../../../utils/spreadsheetImport';
import { planById } from '../../../vendor-dashboard/plans';
import { IMPORT_TIER_OPTIONS, INVITE_METHOD_LABELS, VENDOR_IMPORT } from '../../config/bulkImport';
import { ADMIN_ROUTES } from '../../constants';
import { finishVendorImport, importVendorBatch, startVendorImport } from '../../services/vendorImportService';
import type { ImportPartner, ImportRowOutcome, ImportRowRequest, VendorImportRowRecord, VendorImportSettings } from '../../bulk/types';

interface ImportRunStepProps {
  partner: ImportPartner;
  fileName: string;
  settings: VendorImportSettings;
  requests: ImportRowRequest[];
  consent: boolean;
  /** Called once the import is under way (the earlier steps lock). */
  onStarted: () => void;
  onRestart: () => void;
}

const OUTCOMES: {id: ImportRowOutcome;label: string;tone: string;}[] = [
{ id: 'created', label: 'Created', tone: 'text-pine' },
{ id: 'linked', label: 'Linked', tone: 'text-pine' },
{ id: 'skipped', label: 'Skipped', tone: 'text-muted' },
{ id: 'failed', label: 'Failed', tone: 'text-clay-dark' }];


const failedRow = (r: ImportRowRequest, reason: string): VendorImportRowRecord => ({
  line: r.line,
  fullName: r.profile.fullName,
  businessName: r.profile.businessName,
  phone: r.profile.phone,
  email: r.profile.email ?? null,
  outcome: 'failed',
  reason,
  vendorId: null,
  inviteId: null
});

/** Step 5: what will happen, a confirmation, then the import in batches with a progress bar, then the results. */
export function ImportRunStep({ partner, fileName, settings, requests, consent, onStarted, onRestart }: ImportRunStepProps) {
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<VendorImportRowRecord[] | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const planned = (action: ImportRowRequest['action']) => requests.filter((r) => r.action === action).length;

  async function run() {
    setConfirming(false);
    setRunning(true);
    setError('');
    try {
      const { id } = await startVendorImport({ partnerId: partner.id, fileName, settings, consent, rowCount: requests.length });
      setImportId(id);
      onStarted();
      const out: VendorImportRowRecord[] = [];
      for (let i = 0; i < requests.length; i += VENDOR_IMPORT.batchSize) {
        const batch = requests.slice(i, i + VENDOR_IMPORT.batchSize);
        try {
          out.push(...await importVendorBatch(id, batch, window.location.origin));
        } catch (e) {
          // The whole request failed (e.g. the connection dropped): mark these rows failed and carry on.
          out.push(...batch.map((r) => failedRow(r, e instanceof Error ? e.message : 'The request failed.')));
        }
        setDone(out.length);
      }
      await finishVendorImport(id);
      setResults(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The import couldn’t start. Try again.');
    } finally {
      setRunning(false);
    }
  }

  function downloadOutcome(outcome: ImportRowOutcome) {
    const rows = (results ?? []).filter((r) => r.outcome === outcome);
    downloadText(
      `${fileName.replace(/\.[^.]+$/, '')}-${outcome}.csv`,
      csvWithBom([['row', 'full_name', 'business_name', 'phone', 'email', 'result', 'reason', 'vendor_id'], ...rows.map((r) => [r.line, r.fullName, r.businessName, formatLocalPhone(r.phone), r.email ?? '', r.outcome, r.reason ?? '', r.vendorId ?? ''])])
    );
  }

  if (results) {
    const count = (o: ImportRowOutcome) => results.filter((r) => r.outcome === o).length;
    return (
      <div className="space-y-4">
        <div role="status" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
          <h3 className="text-lg font-extrabold">Import finished</h3>
          <p className="text-sm text-muted">{partner.name} · {fileName}. The uploaded file isn’t kept; only these results are.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-4">
            {OUTCOMES.map((o) =>
            <li key={o.id} className="rounded-xl bg-sand px-3 py-2">
                <p className="text-sm font-semibold text-muted">{o.label}</p>
                <p className={`text-2xl font-extrabold ${o.tone}`}>{count(o.id)}</p>
                <Button variant="ghost" size="sm" icon={DownloadIcon} disabled={count(o.id) === 0} onClick={() => downloadOutcome(o.id)} aria-label={`Download ${o.label.toLowerCase()} rows as CSV`}>CSV</Button>
              </li>
            )}
          </ul>
          {count('failed') > 0 &&
          <ul className="mt-4 space-y-1 text-sm">
              {results.filter((r) => r.outcome === 'failed').map((r) =>
            <li key={r.line} className="text-clay-dark">Row {r.line}, {r.businessName}: {r.reason}</li>
            )}
            </ul>
          }
        </div>
        <div className="flex flex-wrap gap-2">
          {importId && <Link to={ADMIN_ROUTES.vendorImportDetail(importId)} className="rounded-xl bg-pine-deep px-5 py-3 text-[15px] font-bold text-white hover:bg-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2">See who has claimed</Link>}
          <Button variant="secondary" onClick={onRestart}>Start another import</Button>
        </div>
      </div>);

  }

  const tier = IMPORT_TIER_OPTIONS.find((t) => t.id === settings.tier)?.label;
  const pct = requests.length ? Math.round(done / requests.length * 100) : 0;
  return (
    <div className="space-y-4">
      <section aria-labelledby="summary-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
        <h3 id="summary-heading" className="font-bold">What will happen</h3>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Partner</dt><dd className="font-semibold">{partner.name}</dd></div>
          <div><dt className="text-muted">File</dt><dd className="font-semibold">{fileName}</dd></div>
          <div><dt className="text-muted">New draft profiles to create</dt><dd className="font-semibold">{planned('create')}</dd></div>
          <div><dt className="text-muted">Existing vendors to link</dt><dd className="font-semibold">{planned('link')}</dd></div>
          <div><dt className="text-muted">Rows to skip (existing, or still with errors)</dt><dd className="font-semibold">{planned('skip')}</dd></div>
          <div><dt className="text-muted">Plan</dt><dd className="font-semibold">{planById(settings.planId).name}, through the bundle</dd></div>
          <div><dt className="text-muted">Membership starts</dt><dd className="font-semibold">{format(new Date(`${settings.startDate}T00:00:00`), 'd MMM yyyy')}</dd></div>
          <div><dt className="text-muted">Starting tier</dt><dd className="font-semibold">{tier}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted">Invitations</dt><dd className="font-semibold">{INVITE_METHOD_LABELS[settings.invite]}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">
          New profiles stay hidden from search and booking (status “Invited”) until each vendor claims theirs. New and linked vendors join {partner.name}’s bundle awaiting its prorated payment.
        </p>
      </section>

      {running || done > 0 ?
      <div className="rounded-2xl border border-line bg-white p-4">
          <p id="progress-label" className="text-sm font-semibold">{running ? `Importing… ${done} of ${requests.length} rows` : `${done} of ${requests.length} rows processed`}</p>
          <div role="progressbar" aria-labelledby="progress-label" aria-valuemin={0} aria-valuemax={requests.length} aria-valuenow={done} className="mt-2 h-3 overflow-hidden rounded-full bg-sand">
            <div className="h-3 rounded-full bg-pine transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div> :

      <Button variant="accent" disabled={planned('create') + planned('link') === 0} onClick={() => setConfirming(true)}>
          Import {planned('create') + planned('link')} {planned('create') + planned('link') === 1 ? 'vendor' : 'vendors'}
        </Button>
      }
      {error && <p role="alert" className="text-sm font-medium text-clay-dark">{error}</p>}

      <ConfirmDialog
        open={confirming}
        title={`Import into ${partner.name}?`}
        description={
        <>
            This creates {planned('create')} draft {planned('create') === 1 ? 'profile' : 'profiles'}
            {settings.invite !== 'none' && ` and sends each a claim link by ${INVITE_METHOD_LABELS[settings.invite]}`}, links {planned('link')} existing{' '}
            {planned('link') === 1 ? 'vendor' : 'vendors'}, and adds them to the bundle. You can undo it later for anyone who hasn’t claimed their profile.
          </>
        }
        confirmLabel="Import"
        onConfirm={run}
        onCancel={() => setConfirming(false)} />

    </div>);

}
