import React from 'react';
import { Link } from 'react-router-dom';
import { BriefcaseIcon, ChevronRightIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { useJobs } from '../contexts/JobsContext';
import { user } from '../data/user';

export function Profile() {
  const { jobs } = useJobs();
  const rows = [
  { label: 'Phone', value: user.phone },
  { label: 'Saved address', value: user.address },
  { label: 'Languages', value: user.language },
  { label: 'Jobs booked', value: String(jobs.length) }];


  return (
    <>
      <PageHeader title={user.fullName} subtitle={user.location} />
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">
        <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white lg:max-w-2xl">
          {rows.map((r) =>
          <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-4 lg:px-5">
              <dt className="text-sm font-semibold text-muted">{r.label}</dt>
              <dd className="text-right text-[15px] font-bold text-ink">{r.value}</dd>
            </div>
          )}
        </dl>
        <Link
          to="/pro"
          className="mt-4 flex items-center gap-4 rounded-2xl border border-line bg-white px-4 py-4 transition-colors duration-150 hover:border-pine/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 lg:max-w-2xl lg:px-5">
          
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3EEEC] text-pine" aria-hidden="true">
            <BriefcaseIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">Vendor portal</p>
            <p className="text-sm text-muted">Manage requests, calendar and earnings</p>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-muted" aria-hidden="true" />
        </Link>
      </div>
    </>);

}