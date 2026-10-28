import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { ImportDropzone } from '../../components/vendor/ImportDropzone';
import { ImportPreview } from '../../components/vendor/ImportPreview';
import { useVendors } from '../../contexts/VendorsContext';
import { rowsFromTable, type ImportRow } from '../../utils/productImport';
import { SpreadsheetError, readSpreadsheet } from '../../utils/spreadsheet';
import { PLAN_LIMIT } from '../../features/vendor-dashboard/constants';
import { UpgradePrompt } from '../../features/vendor-dashboard/components/subscription/UpgradePrompt';
import { usePlanLimits } from '../../features/vendor-dashboard/hooks/usePlanLimits';
import { NotFound } from '../NotFound';
import type { NewProductInput } from '../../types/marketplace';
import { useCurrentVendor } from '../../features/auth/hooks/useCurrentVendor';

const LIST = '/pro/catalogue/products';

interface LoadedFile {
  name: string;
  rows: ImportRow[];
  ignoredColumns: string[];
}

export function ProductImport() {
  const { t } = useTranslation('vendor');
  const navigate = useNavigate();
  const { getVendor, updateVendorProfile } = useVendors();
  const { vendorId } = useCurrentVendor();
  const vendor = getVendor(vendorId);
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const limits = usePlanLimits();
  const [overLimit, setOverLimit] = useState<string | null>(null);

  const existingNames = useMemo(() => new Set((vendor?.products ?? []).map((p) => p.name.trim().toLowerCase())), [vendor]);

  if (!vendor) return <NotFound message={t('profile.notFoundTitle')} />;

  async function handleFile(file: File) {
    setReading(true);
    setError('');
    try {
      const { rows, ignoredColumns, error: tableError } = rowsFromTable(await readSpreadsheet(file));
      if (tableError) setError(tableError);else
      setLoaded({ name: file.name, rows, ignoredColumns });
    } catch (e) {
      setError(e instanceof SpreadsheetError ? e.message : t('products.readFailed'));
    } finally {
      setReading(false);
    }
  }

  function handleImport(products: NewProductInput[]) {
    if (!vendor) return;
    const limit = limits.limitOf(PLAN_LIMIT.Products);
    if (limit !== null && vendor.products.length + products.length > limit) {
      const room = Math.max(0, limit - vendor.products.length);
      setOverLimit(t('products.overLimit', { limit, have: vendor.products.length, room }));
      return;
    }
    setOverLimit(null);
    const stamp = Date.now();
    const created = products.map((p, i) => ({ ...p, id: `p${stamp}-${i}` }));
    updateVendorProfile(vendor.id, { products: [...created, ...vendor.products] });
    const hidden = created.filter((p) => p.images.length === 0).length;
    navigate(LIST, {
      state: {
        notice: t('products.imported', { count: created.length }) + (hidden ? ` ${t('products.importedHidden', { count: hidden })}` : '')
      }
    });
  }

  return (
    <>
      <PageHeader
        title={t('products.importTitle')}
        subtitle={t('products.importSubtitle')}
        backTo={{ to: LIST, label: t('products.title') }} />

      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">
        {overLimit && limits.plan &&
        <div className="mb-4 space-y-2">
            <p role="alert" className="text-sm font-semibold text-clay-dark">{overLimit}</p>
            <UpgradePrompt limitKey={PLAN_LIMIT.Products} plan={limits.plan} />
          </div>
        }
        {loaded ?
        <ImportPreview
          fileName={loaded.name}
          rows={loaded.rows}
          ignoredColumns={loaded.ignoredColumns}
          existingNames={existingNames}
          onRowsChange={(rows) => setLoaded({ ...loaded, rows })}
          onImport={handleImport}
          onReset={() => setLoaded(null)} /> :


        <ImportDropzone onFile={handleFile} reading={reading} error={error} />
        }
      </div>
    </>);

}
