import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2Icon, MapPinIcon, MessageSquareIcon, TriangleAlertIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { JobStepper } from '../components/JobStepper';
import { StatTile } from '../components/StatTile';
import { NotFound } from './NotFound';
import { useJobs } from '../contexts/JobsContext';
import { vendors } from '../data/vendors';
import { formatDay, formatNaira, formatTime } from '../utils/format';

type ReportState = 'closed' | 'open' | 'sending' | 'sent';

export function JobStatus() {
  const { jobId } = useParams();
  const { getJob } = useJobs();
  const job = jobId ? getJob(jobId) : undefined;
  const [report, setReport] = useState<ReportState>('closed');
  const [reportText, setReportText] = useState('');

  if (!job) return <NotFound message="We couldn't find that job." />;
  const vendor = vendors.find((v) => v.id === job.vendorId);

  function submitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportText.trim()) return;
    setReport('sending');
    window.setTimeout(() => setReport('sent'), 600);
  }

  return (
    <>
      <PageHeader title={`Job #${job.id}`} subtitle={vendor?.name} backTo={{ to: '/bookings', label: 'Bookings' }} />
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">
        <div className="lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:px-8 lg:py-6">
          <JobStepper stage={job.stage} />
        </div>

        <div className="mt-5 grid gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
          <div className="order-2 lg:order-1">
            <section aria-labelledby="details-heading">
              <h2 id="details-heading" className="text-lg font-extrabold text-ink">Job details</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink">{job.description}</p>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                <MapPinIcon className="h-4 w-4" aria-hidden="true" />
                {job.address}
              </p>
              {job.photos.length > 0 &&
              <div className="mt-4 flex flex-wrap gap-3">
                  {job.photos.map((src, i) =>
                <img key={src} src={src} alt={`Job photo ${i + 1}`} className="h-24 w-24 rounded-xl object-cover lg:h-32 lg:w-32" />
                )}
                </div>
              }
            </section>
          </div>

          <aside className="order-1 space-y-3 lg:order-2" aria-label="Quote and actions">
            <div className="grid grid-cols-2 gap-3">
              <StatTile value={job.quote ? formatNaira(job.quote) : 'Pending'} label={job.quote ? 'Fixed quote' : 'Awaiting quote'} />
              <StatTile value={formatDay(job.scheduledAt)} label={formatTime(job.scheduledAt)} />
            </div>
            <div className="space-y-3 pt-2">
              <Link
                to="/inbox"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-base font-bold text-ink transition-colors duration-150 hover:border-pine/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
                
                <MessageSquareIcon className="h-5 w-5 text-pine" aria-hidden="true" />
                Message vendor
              </Link>
              {report === 'closed' &&
              <button
                type="button"
                onClick={() => setReport('open')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-clay bg-white px-5 py-3 text-base font-bold text-clay-dark transition-colors duration-150 hover:bg-clay-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">
                
                  <TriangleAlertIcon className="h-5 w-5" aria-hidden="true" />
                  Report an issue
                </button>
              }
              <AnimatePresence initial={false}>
                {(report === 'open' || report === 'sending') &&
                <motion.form
                  key="report"
                  onSubmit={submitReport}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  className="rounded-2xl border border-clay bg-white p-4">
                  
                    <label htmlFor="report" className="block text-sm font-bold text-ink">What went wrong?</label>
                    <textarea
                    id="report"
                    rows={3}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="Vendor didn't show up, price changed, work incomplete…"
                    className="mt-2 w-full resize-none rounded-xl border border-line px-3 py-2.5 text-[15px] placeholder:text-muted focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20" />
                  
                    <div className="mt-3 flex gap-2">
                      <button
                      type="button"
                      onClick={() => setReport('closed')}
                      className="flex-1 rounded-xl bg-sand px-4 py-2.5 text-sm font-bold text-ink hover:bg-line">
                      
                        Cancel
                      </button>
                      <button
                      type="submit"
                      disabled={!reportText.trim() || report === 'sending'}
                      className="flex-1 rounded-xl bg-clay px-4 py-2.5 text-sm font-bold text-white hover:bg-clay-dark disabled:opacity-50">
                      
                        {report === 'sending' ? 'Sending…' : 'Send report'}
                      </button>
                    </div>
                  </motion.form>
                }
                {report === 'sent' &&
                <motion.div
                  key="sent"
                  role="status"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  className="flex items-start gap-3 rounded-2xl bg-[#E3EEEC] p-4 text-sm text-pine">
                  
                    <CheckCircle2Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <p><strong className="font-bold">Report received.</strong> Our support team will reach out within 2 hours.</p>
                  </motion.div>
                }
              </AnimatePresence>
            </div>
          </aside>
        </div>
      </div>
    </>);

}