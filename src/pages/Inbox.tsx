import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { messageThreads } from '../data/messages';
import { vendors } from '../data/vendors';

export function Inbox() {
  return (
    <>
      <PageHeader title="Inbox" subtitle="Messages with your vendors" />
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white lg:max-w-3xl">
          {messageThreads.map((t) => {
            const vendor = vendors.find((v) => v.id === t.vendorId);
            return (
              <li key={t.id}>
                <Link
                  to={`/jobs/${t.jobId}`}
                  className="flex items-start gap-4 px-4 py-4 transition-colors duration-150 hover:bg-cream focus:outline-none focus-visible:bg-cream lg:px-5">
                  
                  {vendor && <img src={vendor.photo} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={`truncate text-ink ${t.unread ? 'font-extrabold' : 'font-bold'}`}>{vendor?.name}</p>
                      <span className="shrink-0 text-xs font-semibold text-muted">{t.time}</span>
                    </div>
                    <p className={`mt-0.5 line-clamp-2 text-sm ${t.unread ? 'font-semibold text-ink' : 'text-muted'}`}>{t.preview}</p>
                    <p className="mt-1 text-xs text-muted">Job #{t.jobId}</p>
                  </div>
                  {t.unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-clay" aria-label="Unread" />}
                </Link>
              </li>);

          })}
        </ul>
      </div>
    </>);

}