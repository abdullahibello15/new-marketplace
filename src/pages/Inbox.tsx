import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { messageThreads } from '../data/messages';
import { vendors } from '../data/vendors';

export function Inbox() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('inbox.title')} subtitle={t('inbox.subtitle')} />
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white lg:max-w-3xl">
          {messageThreads.map((thread) => {
            const vendor = vendors.find((v) => v.id === thread.vendorId);
            return (
              <li key={thread.id}>
                <Link
                  to={`/jobs/${thread.jobId}`}
                  className="flex items-start gap-4 px-4 py-4 transition-colors duration-150 hover:bg-cream focus:outline-none focus-visible:bg-cream lg:px-5">
                  
                  {vendor && <img src={vendor.photo} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={`truncate text-ink ${thread.unread ? 'font-extrabold' : 'font-bold'}`}>{vendor?.name}</p>
                      <span className="shrink-0 text-xs font-semibold text-muted">{thread.time}</span>
                    </div>
                    <p className={`mt-0.5 line-clamp-2 text-sm ${thread.unread ? 'font-semibold text-ink' : 'text-muted'}`}>{thread.preview}</p>
                    <p className="mt-1 text-xs text-muted">{t('inbox.job', { id: thread.jobId })}</p>
                  </div>
                  {thread.unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-clay" aria-label={t('inbox.unread')} />}
                </Link>
              </li>);

          })}
        </ul>
      </div>
    </>);

}