import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2Icon, PlusIcon, XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../components/PageHeader';
import { VerificationBadge } from '../components/VerificationBadge';
import { NotFound } from './NotFound';
import { useJobs } from '../contexts/JobsContext';
import { timeSlots, useJobRequestForm } from '../hooks/useJobRequestForm';
import { vendors } from '../data/vendors';
import { user } from '../data/user';

const inputClass =
'w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted focus:outline-none focus:ring-2';
const okBorder = 'border-line focus:border-pine focus:ring-pine/20';
const errBorder = 'border-clay focus:border-clay focus:ring-clay/20';
const labelClass = 'mb-1.5 block text-sm font-bold text-muted';

export function RequestJob() {
  const { vendorId } = useParams();
  const vendor = vendors.find((v) => v.id === vendorId);
  const navigate = useNavigate();
  const { addJob } = useJobs();
  const form = useJobRequestForm(user.address);
  const { values, errors, photos } = form;

  if (!vendor) return <NotFound message="We couldn't find that vendor." />;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor || !form.validate()) return;
    form.setSubmitting(true);
    window.setTimeout(() => {
      const job = addJob({
        vendorId: vendor.id,
        description: values.description.trim(),
        photos: photos.map((p) => p.url),
        scheduledAt: form.scheduledAt,
        address: values.address.trim()
      });
      navigate(`/jobs/${job.id}`, { replace: true });
    }, 700);
  }

  return (
    <>
      <PageHeader title="Request a job" subtitle={vendor.name} backTo={{ to: `/vendor/${vendor.id}`, label: vendor.name }} />
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:px-10 lg:py-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-5 lg:max-w-2xl">
          <div>
            <label htmlFor="description" className={labelClass}>What do you need done?</label>
            <textarea
              id="description"
              rows={3}
              value={values.description}
              onChange={(e) => form.setField('description', e.target.value)}
              placeholder="Kitchen tap leaking, needs replacement washer or new tap…"
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? 'description-error' : undefined}
              className={`${inputClass} resize-none ${errors.description ? errBorder : okBorder}`} />
            
            {errors.description && <p id="description-error" className="mt-1.5 text-sm font-medium text-clay-dark">{errors.description}</p>}
          </div>

          <div>
            <span className={labelClass} id="photos-label">Photos (optional)</span>
            <div className="flex flex-wrap gap-3" aria-labelledby="photos-label">
              {photos.map((p, i) =>
              <div key={p.id} className="relative">
                  <img src={p.url} alt={`Uploaded photo ${i + 1}`} className="h-[72px] w-[72px] rounded-xl object-cover" />
                  <button
                  type="button"
                  onClick={() => form.removePhoto(p.id)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pine">
                  
                    <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
              {photos.length < 4 &&
              <button
                type="button"
                onClick={() => form.fileInputRef.current?.click()}
                className="flex h-[72px] w-[72px] items-center justify-center rounded-xl border-2 border-dashed border-line text-muted transition-colors duration-150 hover:border-pine/40 hover:text-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40"
                aria-label="Add photo">
                
                  <PlusIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              }
              <input ref={form.fileInputRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={form.handleFiles} />
            </div>
          </div>

          <fieldset>
            <legend className={labelClass}>Preferred date & time</legend>
            <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3">
              <input
                type="date"
                aria-label="Date"
                value={values.date}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => form.setField('date', e.target.value)}
                aria-invalid={Boolean(errors.date)}
                className={`${inputClass} ${errors.date ? errBorder : okBorder}`} />
              
              <select
                aria-label="Time"
                value={values.time}
                onChange={(e) => form.setField('time', e.target.value)}
                className={`${inputClass} ${okBorder}`}>
                
                {timeSlots.map((t) =>
                <option key={t} value={t}>{format(new Date(`2000-01-01T${t}:00`), 'h:mm a')}</option>
                )}
              </select>
            </div>
            {errors.date && <p className="mt-1.5 text-sm font-medium text-clay-dark">{errors.date}</p>}
          </fieldset>

          <div>
            <label htmlFor="address" className={labelClass}>Address</label>
            <input
              id="address"
              type="text"
              value={values.address}
              onChange={(e) => form.setField('address', e.target.value)}
              placeholder="Area and a landmark, e.g. Tunga, behind NEPA office"
              aria-invalid={Boolean(errors.address)}
              aria-describedby={errors.address ? 'address-error' : undefined}
              className={`${inputClass} ${errors.address ? errBorder : okBorder}`} />
            
            {errors.address && <p id="address-error" className="mt-1.5 text-sm font-medium text-clay-dark">{errors.address}</p>}
          </div>

          <button
            type="submit"
            disabled={form.submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-clay px-5 py-3.5 text-base font-bold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-clay-dark active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-cream">
            
            {form.submitting && <Loader2Icon className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {form.submitting ? 'Sending…' : 'Send request'}
          </button>
        </form>

        <aside className="hidden lg:block lg:sticky lg:top-8 lg:self-start" aria-label="Vendor summary">
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center gap-3">
              <img src={vendor.photo} alt="" className="h-14 w-14 rounded-xl object-cover" />
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{vendor.name}</p>
                <div className="mt-1"><VerificationBadge verification={vendor.verification} /></div>
              </div>
            </div>
            <dl className="mt-5 divide-y divide-line border-t border-line text-sm">
              <div className="flex justify-between py-3"><dt className="text-muted">Typical price</dt><dd className="font-bold text-ink">{vendor.priceRange}</dd></div>
              <div className="flex justify-between py-3"><dt className="text-muted">Usually responds</dt><dd className="font-bold text-ink">{vendor.responseTime}</dd></div>
            </dl>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {vendor.name.split(' ')[0]} will reply with a fixed quote. Nothing is booked until you accept it.
            </p>
          </div>
        </aside>
      </div>
    </>);

}