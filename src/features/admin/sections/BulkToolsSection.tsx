import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FileUpIcon, UsersIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { ADMIN_ROUTES } from '../constants';
import { listVendorImports } from '../services/vendorImportService';
import { IMPORT_STATUS_META } from '../components/bulk/importStatus';

/** /admin/bulk — Bulk tools (Super admin, Verifier): start a vendor import, and the history of past imports. */
export function BulkToolsSection() {
  const { data, status, error, reload } = useAsyncData(listVendorImports);

  function renderHistory() {
    if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (!data) return <LoadingState label="Loading import history" />;
    if (data.length === 0) return <EmptyState icon={FileUpIcon} title="No imports yet" description="Imports you run will be listed here." />;
    return (
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <caption className="sr-only">Vendor imports, newest first</caption>
          <thead className="border-b border-line bg-sand/60 text-xs font-bold uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Date</th>
              <th scope="col" className="px-3 py-3">Partner</th>
              <th scope="col" className="px-3 py-3">Run by</th>
              <th scope="col" className="px-3 py-3">File</th>
              <th scope="col" className="px-3 py-3 text-right">Created</th>
              <th scope="col" className="px-3 py-3 text-right">Linked</th>
              <th scope="col" className="px-3 py-3 text-right">Skipped</th>
              <th scope="col" className="px-3 py-3 text-right">Failed</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.map((r) =>
            <tr key={r.id} className="hover:bg-cream">
                <td className="whitespace-nowrap px-4 py-3">
                  <Link to={ADMIN_ROUTES.vendorImportDetail(r.id)} className="font-semibold text-pine underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
                    {format(new Date(r.createdAt), 'd MMM yyyy, HH:mm')}
                  </Link>
                </td>
                <td className="px-3 py-3">{r.partner.name}</td>
                <td className="px-3 py-3">{r.by.name}</td>
                <td className="max-w-[14rem] truncate px-3 py-3 text-muted">{r.fileName}</td>
                {(['created', 'linked', 'skipped', 'failed'] as const).map((k) =>
              <td key={k} className={`px-3 py-3 text-right tabular-nums ${k === 'failed' && r.counts.failed ? 'font-bold text-clay-dark' : ''}`}>{r.counts[k]}</td>
              )}
                <td className="px-4 py-3"><Badge tone={IMPORT_STATUS_META[r.status].tone}>{IMPORT_STATUS_META[r.status].label}</Badge></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>);

  }

  return (
    <>
      <PageHeader title="Bulk tools" subtitle="Large changes in one go, each one audited" />
      <PageContainer className="space-y-6">
        <section aria-labelledby="tools-heading">
          <h2 id="tools-heading" className="sr-only">Tools</h2>
          <Link
            to={ADMIN_ROUTES.vendorImport}
            className="flex max-w-xl items-start gap-4 rounded-2xl border border-line bg-white p-5 transition-colors hover:border-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

            <span className="rounded-xl bg-[#E3EEEC] p-3 text-pine"><UsersIcon className="h-6 w-6" aria-hidden="true" /></span>
            <span>
              <span className="block text-lg font-bold">Import vendors for a trade association</span>
              <span className="block text-sm text-muted">Upload a partner’s member list (.csv or .xlsx). Each member gets a draft profile and a “claim your profile” invitation, and joins the association’s bundle.</span>
            </span>
          </Link>
        </section>
        <section aria-labelledby="history-heading" className="space-y-3">
          <h2 id="history-heading" className="text-lg font-bold">Import history</h2>
          {renderHistory()}
        </section>
      </PageContainer>
    </>);

}
