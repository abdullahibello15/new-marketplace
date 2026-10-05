import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarXIcon, ChevronRightIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { useJobs } from '../contexts/JobsContext';
import { vendors } from '../data/vendors';
import { jobStages } from '../data/jobStages';
import { formatDay, formatTime } from '../utils/format';

export function Bookings() {
  const { jobs } = useJobs();
  const active = jobs.filter((j) => j.stage !== 'completed');
  const past = jobs.filter((j) => j.stage === 'completed');

  return (
    <>
      <PageHeader title="Bookings" subtitle={`${active.length} active · ${past.length} completed`} />
      <div className="mx-auto max-w-6xl space-y-8 px-5 py-6 lg:px-10 lg:py-8">
        {jobs.length === 0 ?
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <CalendarXIcon className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="mt-3 font-bold">No bookings yet</p>
            <Link to="/" className="mt-3 text-sm font-bold text-clay-dark">Find a vendor</Link>
          </div> :

        [
        { title: 'Active', items: active },
        { title: 'Completed', items: past }].

        filter((g) => g.items.length > 0).
        map((group) =>
        <section key={group.title} aria-labelledby={`${group.title}-heading`}>
                <h2 id={`${group.title}-heading`} className="text-xs font-bold uppercase tracking-wider text-muted">{group.title}</h2>
                <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                  {group.items.map((job) => {
              const vendor = vendors.find((v) => v.id === job.vendorId);
              const stage = jobStages.find((s) => s.id === job.stage);
              return (
                <li key={job.id}>
                        <Link
                    to={`/jobs/${job.id}`}
                    className="flex items-center gap-4 px-4 py-4 transition-colors duration-150 hover:bg-cream focus:outline-none focus-visible:bg-cream lg:px-5">
                    
                          {vendor && <img src={vendor.photo} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-ink">{vendor?.name}</p>
                            <p className="truncate text-sm text-muted">
                              #{job.id} · {formatDay(job.scheduledAt)}, {formatTime(job.scheduledAt)}
                              <span className="hidden md:inline"> · {job.description}</span>
                            </p>
                          </div>
                          {stage &&
                    <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold ${stage.badgeClass}`}>{stage.label}</span>
                    }
                          <ChevronRightIcon className="hidden h-5 w-5 text-muted sm:block" aria-hidden="true" />
                        </Link>
                      </li>);

            })}
                </ul>
              </section>
        )
        }
      </div>
    </>);

}