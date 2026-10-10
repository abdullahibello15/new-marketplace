import { useEffect, useMemo, useState } from 'react';
import { ShieldCheckIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { PageContainer } from '../../../components/ui/PageContainer';
import { StatusSteps, type StatusStep } from '../../../components/ui/StatusSteps';
import { ImportDropzone } from '../../../components/vendor/ImportDropzone';
import { toDateKey } from '../../../lib/dates';
import { SpreadsheetError, readSpreadsheet } from '../../../utils/spreadsheet';
import { formatLocalPhone } from '../../../utils/phone';
import { BUNDLE_RULES } from '../../vendor-dashboard/bundles';
import { CONSENT_TEXT, VENDOR_IMPORT } from '../config/bulkImport';
import { ADMIN_ROUTES } from '../constants';
import { getImportLookup } from '../services/vendorImportService';
import { COLUMN_LABELS, buildVendorTemplateCsv, checkVendorRows, vendorRowsFromTable, type VendorImportRow } from '../bulk/vendorImport';
import { PartnerStep } from '../components/bulk/PartnerStep';
import { VendorImportReview } from '../components/bulk/VendorImportReview';
import { ImportSettingsStep } from '../components/bulk/ImportSettingsStep';
import { ImportRunStep } from '../components/bulk/ImportRunStep';
import type { ExistingChoice, ImportLookup, ImportPartner, ImportRowRequest, VendorImportColumn, VendorImportSettings } from '../bulk/types';

const STEPS = ['Partner', 'Upload', 'Check', 'Settings', 'Import'] as const;
const SAMPLE_CSV = '/samples/vendor-import-sample.csv';

const REQUIRED = new Set<VendorImportColumn>(['full_name', 'business_name', 'phone', 'trade_category', 'lga', 'town_landmark']);
const HELP: Record<VendorImportColumn, string> = {
  full_name: 'The owner’s name.',
  business_name: 'As customers will see it.',
  phone: 'Nigerian mobile: 0803…, 0813…, 0903…, 0703… or +234…. Saved as +234.',
  email: 'Used for the invitation if you choose email.',
  trade_category: 'One of Gwani’s trade categories, e.g. Plumber, Tailor, Electrician.',
  lga: 'A Niger State LGA, e.g. Chanchaga, Bosso, Suleja.',
  town_landmark: 'Town, area or landmark, e.g. “Tunga, near Kure Market”.',
  years_experience: 'Whole number.',
  bio: `Up to ${VENDOR_IMPORT.bioMaxLength} characters.`,
  service_areas: 'Niger State LGAs separated by ; (their own LGA if blank).'
};

interface LoadedFile {
  name: string;
  rows: VendorImportRow[];
  ignoredColumns: string[];
}

/**
 * /admin/bulk/vendor-import — bulk vendor import for a trade-association partnership, as a stepper:
 * partner → upload (consent first) → check and fix in the browser → settings → confirm and import.
 */
export function VendorImportSection() {
  const [step, setStep] = useState(0);
  const [partner, setPartner] = useState<ImportPartner | null>(null);
  const [lookup, setLookup] = useState<ImportLookup | null>(null);
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [choices, setChoices] = useState<Record<string, ExistingChoice>>({});
  const [settings, setSettings] = useState<VendorImportSettings>({ planId: BUNDLE_RULES.memberPlanId, startDate: toDateKey(new Date()), tier: 'unverified', invite: 'sms' });
  const [locked, setLocked] = useState(false);

  // Duplicates are checked against the chosen partner's members and every existing vendor.
  useEffect(() => {
    if (!partner) return;
    let live = true;
    setLookup(null);
    getImportLookup(partner.id).then((l) => live && setLookup(l)).catch(() => live && setLookup({ phones: {}, emails: {} }));
    return () => {
      live = false;
    };
  }, [partner]);

  const checks = useMemo(() => file && lookup ? checkVendorRows(file.rows, lookup) : [], [file, lookup]);

  const requests = useMemo((): ImportRowRequest[] => {
    if (!file) return [];
    return file.rows.map((row, i): ImportRowRequest => {
      const c = checks[i];
      const contact = { fullName: row.raw.full_name, businessName: row.raw.business_name, phone: c?.profile?.phone ?? row.raw.phone, email: c?.profile?.email ?? (row.raw.email || null) };
      if (!c?.profile) return { line: row.line, action: 'skip', reason: `Had errors: ${c?.errors.map((e) => e.message).join(' ') ?? 'not checked'}`, profile: contact };
      const existing = c.existing;
      if (existing?.alreadyMember) return { line: row.line, action: 'skip', reason: `${existing.vendorName} is already a member.`, profile: contact };
      if (existing) {
        return (choices[row.id] ?? 'skip') === 'link' ?
        { line: row.line, action: 'link', vendorId: existing.vendorId, vendorName: existing.vendorName, contact: formatLocalPhone(c.profile.phone), profile: contact } :
        { line: row.line, action: 'skip', reason: `Already on Gwani as ${existing.vendorName}; skipped.`, profile: contact };
      }
      return { line: row.line, action: 'create', profile: c.profile };
    });
  }, [file, checks, choices]);

  async function handleFile(f: File) {
    setReading(true);
    setFileError('');
    try {
      const { rows, ignoredColumns, error } = vendorRowsFromTable(await readSpreadsheet(f, { maxBytes: VENDOR_IMPORT.maxBytes }));
      if (error) setFileError(error);else
      {
        // Only the cells are kept in memory for checking; the File itself isn't stored or uploaded.
        setFile({ name: f.name, rows, ignoredColumns });
        setChoices({});
        setStep(2);
      }
    } catch (e) {
      setFileError(e instanceof SpreadsheetError ? e.message : 'Something went wrong reading that file. Try again.');
    } finally {
      setReading(false);
    }
  }

  function restart() {
    setStep(0);
    setFile(null);
    setChoices({});
    setConsent(false);
    setLocked(false);
  }

  const canGo = [!!partner, !!file && consent, !!file && !!lookup && file.rows.length > 0, !!settings.startDate, false];
  const steps: StatusStep[] = STEPS.map((label, i) => ({ key: label, label, state: i < step ? 'done' : i === step ? 'current' : 'upcoming', at: null }));
  const newWithoutEmail = requests.filter((r) => r.action === 'create' && !r.profile.email).length;

  return (
    <>
      <PageHeader title="Import vendors" subtitle="Add a trade association’s members in one go" backTo={{ to: ADMIN_ROUTES.bulk, label: 'Bulk tools' }} />
      <PageContainer className="space-y-5">
        <StatusSteps steps={steps} label="Import steps" />

        {step === 0 && <PartnerStep selected={partner} onSelect={setPartner} />}

        {step === 1 &&
        <div className="space-y-4">
            <section aria-labelledby="consent-heading" className="rounded-2xl border border-mustard bg-[#FBF3DC] p-4">
              <h3 id="consent-heading" className="flex items-center gap-2 font-bold"><ShieldCheckIcon className="h-5 w-5 text-mustard-dark" aria-hidden="true" />Members’ personal data</h3>
              <p className="mt-1 text-sm">
                The file has members’ names, phone numbers and emails. It’s read in your browser and isn’t stored: after the import we keep only each row’s name, business, phone, email and result for the history.
              </p>
              <label className="mt-3 flex items-start gap-2 text-sm font-semibold">
                <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line text-pine focus:ring-pine/40" />
                {CONSENT_TEXT}
              </label>
            </section>
            {consent ?
          <ImportDropzone
            onFile={handleFile}
            reading={reading}
            error={fileError}
            limitsText={`.csv or .xlsx, up to ${Math.round(VENDOR_IMPORT.maxBytes / 1024)} KB and ${VENDOR_IMPORT.maxRows} vendors. Only the first sheet is read.`}
            template={{ fileName: 'gwani-vendor-import-template.csv', build: buildVendorTemplateCsv, intro: 'One member per row. The template has the columns and an example row.' }}
            columns={(Object.keys(COLUMN_LABELS) as VendorImportColumn[]).map((c) => ({ name: c, required: REQUIRED.has(c), help: `${COLUMN_LABELS[c]}. ${HELP[c]}` }))}
            templateExtra={
            <a href={SAMPLE_CSV} download className="mt-2 block text-center text-sm font-semibold text-pine underline underline-offset-2">
                    Download a 25-row sample with mistakes to try
                  </a>
            } /> :


          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">Confirm consent above to upload the member list.</p>
          }
            {file && <p className="text-sm text-muted">Loaded: {file.name} ({file.rows.length} rows). Upload again to replace it.</p>}
          </div>
        }

        {step === 2 && file && (
        lookup ?
        <VendorImportReview
          fileName={file.name}
          ignoredColumns={file.ignoredColumns}
          rows={file.rows}
          checks={checks}
          choices={choices}
          onRowsChange={(rows) => setFile({ ...file, rows })}
          onChoice={(id, choice) => setChoices((c) => ({ ...c, [id]: choice }))}
          onReset={() => {
            setFile(null);
            setStep(1);
          }} /> :


        <p role="status" className="text-sm text-muted">Checking against existing vendors…</p>)
        }

        {step === 3 && <ImportSettingsStep settings={settings} onChange={setSettings} withoutEmail={newWithoutEmail} />}

        {step === 4 && partner && file &&
        <ImportRunStep partner={partner} fileName={file.name} settings={settings} requests={requests} consent={consent} onStarted={() => setLocked(true)} onRestart={restart} />
        }

        {!locked &&
        <div className="flex justify-between gap-2 border-t border-line pt-4">
            <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < 4 && <Button disabled={!canGo[step]} onClick={() => setStep((s) => s + 1)}>Continue</Button>}
          </div>
        }
      </PageContainer>
    </>);

}
