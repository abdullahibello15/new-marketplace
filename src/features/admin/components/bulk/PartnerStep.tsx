import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { field, label as labelClass, ok } from '../../../../components/vendor/formStyles';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { useToast } from '../../../../hooks/useToast';
import { formatLocalPhone } from '../../../../utils/phone';
import { createImportPartner, listImportPartners } from '../../services/vendorImportService';
import type { ImportPartner, NewPartnerInput } from '../../bulk/types';

const input = `${field} ${ok}`;
const EMPTY: NewPartnerInput = { name: '', adminName: '', phone: '', email: '', terms: '' };

/** Step 1: an existing Trade Association, or a new partner with its contact and agreed bundle terms. */
export function PartnerStep({ selected, onSelect }: {selected: ImportPartner | null;onSelect: (partner: ImportPartner) => void;}) {
  const { data, status, error, reload, setData } = useAsyncData(listImportPartners);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NewPartnerInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const toast = useToast();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const partner = await createImportPartner(form);
      setData((prev) => [...prev, partner]);
      onSelect(partner);
      setCreating(false);
      setForm(EMPTY);
      toast.success(`${partner.name} added as a partner.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'That didn’t work. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  if (!data) return <LoadingState label="Loading partners" />;
  const set = (key: keyof NewPartnerInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 font-bold text-ink">Which association sent the member list?</legend>
        {data.map((p) =>
        <label key={p.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 ${selected?.id === p.id ? 'border-pine ring-2 ring-pine/20' : 'border-line hover:border-ink/30'}`}>
            <input type="radio" name="partner" checked={selected?.id === p.id} onChange={() => onSelect(p)} className="mt-1 h-4 w-4 border-line text-pine focus:ring-pine/40" />
            <span className="min-w-0">
              <span className="block font-bold">{p.name}</span>
              <span className="block text-sm text-muted">
                {p.adminName}{p.phone && ` · ${formatLocalPhone(p.phone)}`}{p.email && ` · ${p.email}`} · {p.memberCount} {p.memberCount === 1 ? 'member' : 'members'}
              </span>
              {p.terms && <span className="mt-1 block text-xs text-muted">Terms: {p.terms}</span>}
            </span>
          </label>
        )}
      </fieldset>

      {creating ?
      <form onSubmit={create} className="space-y-3 rounded-2xl border border-line bg-white p-4 lg:p-5" aria-labelledby="new-partner-heading">
          <h3 id="new-partner-heading" className="font-bold">New partner association</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="np-name" className={labelClass}>Association name</label>
              <input id="np-name" required value={form.name} onChange={set('name')} className={input} />
            </div>
            <div>
              <label htmlFor="np-admin" className={labelClass}>Contact person</label>
              <input id="np-admin" required value={form.adminName} onChange={set('adminName')} className={input} />
            </div>
            <div>
              <label htmlFor="np-phone" className={labelClass}>Contact phone</label>
              <input id="np-phone" required type="tel" inputMode="tel" placeholder="0803 123 4567" value={form.phone} onChange={set('phone')} className={input} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="np-email" className={labelClass}>Contact email <span className="font-normal">(optional)</span></label>
              <input id="np-email" type="email" value={form.email} onChange={set('email')} className={input} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="np-terms" className={labelClass}>Agreed bundle terms</label>
              <textarea id="np-terms" required rows={3} placeholder="Plan, discount, how and when they pay, who signed" value={form.terms} onChange={set('terms')} className={input} />
            </div>
          </div>
          {formError && <p role="alert" className="text-sm font-medium text-clay-dark">{formError}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Add partner</Button>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={saving}>Cancel</Button>
          </div>
        </form> :

      <Button variant="outline" icon={PlusIcon} onClick={() => setCreating(true)}>New partner association</Button>
      }
    </div>);

}
