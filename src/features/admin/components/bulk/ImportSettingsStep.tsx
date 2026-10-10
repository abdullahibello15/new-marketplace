import { AlertTriangleIcon } from 'lucide-react';
import { field, label as labelClass, ok } from '../../../../components/vendor/formStyles';
import { toDateKey } from '../../../../lib/dates';
import { formatNaira } from '../../../../utils/format';
import { BUNDLE_RULES } from '../../../vendor-dashboard/bundles';
import { planById } from '../../../vendor-dashboard/plans';
import { IMPORT_TIER_OPTIONS, INVITE_METHOD_LABELS, VENDOR_IMPORT, type InviteMethod } from '../../config/bulkImport';
import type { VendorImportSettings } from '../../bulk/types';

interface ImportSettingsStepProps {
  settings: VendorImportSettings;
  onChange: (settings: VendorImportSettings) => void;
  /** New vendors in the file without an email (they get an SMS if email is chosen). */
  withoutEmail: number;
}

/** Step 4: the bundle plan, start date, starting verification tier and how invitations go out. */
export function ImportSettingsStep({ settings, onChange, withoutEmail }: ImportSettingsStepProps) {
  const plan = planById(BUNDLE_RULES.memberPlanId);
  const set = (patch: Partial<VendorImportSettings>) => onChange({ ...settings, ...patch });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-line bg-white p-4 lg:p-5" aria-labelledby="bundle-heading">
        <h3 id="bundle-heading" className="font-bold">Bundle membership</h3>
        <div>
          <label htmlFor="imp-plan" className={labelClass}>Plan members get</label>
          <select id="imp-plan" value={settings.planId} onChange={(e) => set({ planId: e.target.value as VendorImportSettings['planId'] })} className={`${field} ${ok}`}>
            <option value={plan.id}>{plan.name} ({formatNaira(plan.price)} a month before the bundle discount)</option>
          </select>
          <p className="mt-1 text-xs text-muted">Every bundle member gets the bundle’s plan (set in the bundle config). The association is billed a prorated amount for new members until its next renewal.</p>
        </div>
        <div>
          <label htmlFor="imp-start" className={labelClass}>Membership starts</label>
          <input id="imp-start" type="date" min={toDateKey(new Date())} value={settings.startDate} onChange={(e) => set({ startDate: e.target.value })} className={`${field} ${ok}`} />
          <p className="mt-1 text-xs text-muted">Members wait for the association’s prorated payment; their claim link works for {VENDOR_IMPORT.inviteValidDays} days.</p>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-white p-4 lg:p-5" aria-labelledby="tier-heading">
        <fieldset>
          <legend id="tier-heading" className="font-bold">Verification tier to start on</legend>
          <div className="mt-2 space-y-2">
            {IMPORT_TIER_OPTIONS.map((t) =>
            <label key={t.id} className={`flex items-start gap-3 rounded-xl border p-3 ${t.available ? 'cursor-pointer border-line' : 'border-dashed border-mustard bg-[#FBF3DC]'}`}>
                <input type="radio" name="tier" disabled={!t.available} checked={settings.tier === t.id} onChange={() => set({ tier: t.id })} className="mt-1 h-4 w-4 border-line text-pine focus:ring-pine/40" />
                <span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {t.label}
                    {!t.available && <AlertTriangleIcon className="h-4 w-4 text-mustard-dark" aria-hidden="true" />}
                  </span>
                  <span className="block text-xs text-muted">{t.note}</span>
                </span>
              </label>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-bold">Send the “claim your profile” invitation by</legend>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {(Object.keys(INVITE_METHOD_LABELS) as InviteMethod[]).map((m) =>
            <label key={m} className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="invite" checked={settings.invite === m} onChange={() => set({ invite: m })} className="h-4 w-4 border-line text-pine focus:ring-pine/40" />
                {INVITE_METHOD_LABELS[m]}
              </label>
            )}
          </div>
          {settings.invite === 'email' && withoutEmail > 0 &&
          <p className="mt-2 text-xs text-mustard-dark">{withoutEmail} new {withoutEmail === 1 ? 'vendor has' : 'vendors have'} no email; they’ll get an SMS instead.</p>
          }
          {settings.invite === 'none' && <p className="mt-2 text-xs text-muted">Nothing is sent. You can copy each claim link, or send it later, from the import’s page.</p>}
          <p className="mt-2 text-xs text-muted">MOCK: messages are recorded on the import, not really sent.</p>
        </fieldset>
      </section>
    </div>);

}
