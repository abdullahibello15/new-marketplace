import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { ImportDropzone } from '../../components/vendor/ImportDropzone';
import { ImportPreview } from '../../components/vendor/ImportPreview';
import { useVendors } from '../../contexts/VendorsContext';
import { vendorAccount } from '../../data/vendorPortal';
import { rowsFromTable, type ImportRow } from '../../utils/productImport';
import { SpreadsheetError, readSpreadsheet } from '../../utils/spreadsheet';
import { NotFound } from '../NotFound';
import type { NewProductInput } from '../../types/marketplace';

const LIST = '/pro/catalogue/products';

interface LoadedFile {
  name: string;
  rows: ImportRow[];
  ignoredColumns: string[];
}

export function ProductImport() {
  const navigate = useNavigate();
  const { getVendor, updateVendorProfile } = useVendors();
  const vendor = getVendor(vendorAccount.vendorId);
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');

  const existingNames = useMemo(() => new Set((vendor?.products ?? []).map((p) => p.name.trim().toLowerCase())), [vendor]);

  if (!vendor) return <NotFound message="We couldn't find your vendor profile." />;

  async function handleFile(file: File) {
    setReading(true);
    setError('');
    try {
      const { rows, ignoredColumns, error: tableError } = rowsFromTable(await readSpreadsheet(file));
      if (tableError) setError(tableError);else
      setLoaded({ name: file.name, rows, ignoredColumns });
    } catch (e) {
      setError(e instanceof SpreadsheetError ? e.message : 'Something went wrong reading that file. Try again.');
    } finally {
      setReading(false);
    }
  }

  function handleImport(products: NewProductInput[]) {
    if (!vendor) return;
    const stamp = Date.now();
    const created = products.map((p, i) => ({ ...p, id: `p${stamp}-${i}` }));
    updateVendorProfile(vendor.id, { products: [...created, ...vendor.products] });
    const hidden = created.filter((p) => p.images.length === 0).length;
    navigate(LIST, {
      state: {
        notice:
        `Imported ${created.length} ${created.length === 1 ? 'product' : 'products'}.` + (
        hidden ? ` ${hidden} ${hidden === 1 ? 'needs a photo' : 'need photos'} before customers can see ${hidden === 1 ? 'it' : 'them'}.` : '')
      }
    });
  }

  return (
    <>
      <PageHeader
        title="Import products"
        subtitle="Add many products at once from a spreadsheet"
        backTo={{ to: LIST, label: 'My products' }} />

      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">
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
