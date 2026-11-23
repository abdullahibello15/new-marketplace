import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { ImportDropzone } from "../../components/vendor/ImportDropzone";
import { ImportPreview } from "../../components/vendor/ImportPreview";
import {
  rowsFromTable,
  checkRow,
  type ImportRow,
} from "../../utils/productImport";
import { SpreadsheetError, readSpreadsheet } from "../../utils/spreadsheet";
import { PLAN_LIMIT } from "../../features/vendor-dashboard/constants";
import { UpgradePrompt } from "../../features/vendor-dashboard/components/subscription/UpgradePrompt";
import { usePlanLimits } from "../../features/vendor-dashboard/hooks/usePlanLimits";
import { NotFound } from "../NotFound";
import type { NewProductInput } from "../../types/marketplace";
import { useCurrentVendor } from "../../features/auth/hooks/useCurrentVendor";
import { useVendorProducts } from "../../features/vendor-dashboard/hooks/useVendorProducts";
import { ApiError } from "../../services/mockApi";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import type { ProductImportRowError } from "../../features/vendor-dashboard/services/vendorProductsApi";

const LIST = "/pro/catalogue/products";

interface LoadedFile {
  name: string;
  rows: ImportRow[];
  ignoredColumns: string[];
}

export function ProductImport() {
  const { t } = useTranslation("vendor");
  const navigate = useNavigate();
  const { vendor } = useCurrentVendor();
  const {
    products,
    status,
    error: productsError,
    reload,
    importRows,
  } = useVendorProducts();
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const limits = usePlanLimits();
  const [overLimit, setOverLimit] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<ProductImportRowError[]>([]);

  const existingNames = useMemo(
    () => new Set(products.map((p) => p.name.trim().toLowerCase())),
    [products],
  );

  if (!vendor) return <NotFound message={t("profile.notFoundTitle")} />;
  if (status === "loading")
    return (
      <LoadingState label={t("common:loading")} rows={2} rowClassName="h-24" />
    );
  if (status === "error")
    return <ErrorState message={productsError ?? ""} onRetry={reload} />;

  async function handleFile(file: File) {
    setReading(true);
    setError("");
    try {
      const {
        rows,
        ignoredColumns,
        error: tableError,
      } = rowsFromTable(await readSpreadsheet(file));
      if (tableError) setError(tableError);
      else setLoaded({ name: file.name, rows, ignoredColumns });
    } catch (e) {
      setError(
        e instanceof SpreadsheetError ? e.message : t("products.readFailed"),
      );
    } finally {
      setReading(false);
    }
  }

  async function handleImport(importProducts: NewProductInput[]) {
    if (!vendor) return;
    const limit = limits.limitOf(PLAN_LIMIT.Products);
    if (limit !== null && products.length + importProducts.length > limit) {
      const room = Math.max(0, limit - products.length);
      setOverLimit(
        t("products.overLimit", { limit, have: products.length, room }),
      );
      return;
    }
    setOverLimit(null);
    setServerErrors([]);
    const sourceRows =
      loaded?.rows.flatMap((row) => {
        if (row.skipped) return [];
        const checked = checkRow(row.raw, { existingNames });
        return checked.product
          ? [{ sourceRow: row.line, product: checked.product }]
          : [];
      }) ?? [];
    const rows = importProducts.map((product, index) => ({
      sourceRow: sourceRows[index]?.sourceRow ?? index + 1,
      product,
    }));
    try {
      const created = await importRows(rows);
      navigate(LIST, {
        state: { notice: t("products.imported", { count: created.length }) },
      });
    } catch (cause) {
      if (cause instanceof ApiError) {
        const details = cause.details as
          { rowErrors?: ProductImportRowError[] } | undefined;
        if (details?.rowErrors) {
          setServerErrors(details.rowErrors);
          return;
        }
      }
      setError(
        cause instanceof Error ? cause.message : t("common:error.generic"),
      );
    }
  }

  return (
    <>
      <PageHeader
        title={t("products.importTitle")}
        subtitle={t("products.importSubtitle")}
        backTo={{ to: LIST, label: t("products.title") }}
      />

      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">
        {error && (
          <p role="alert" className="mb-4 text-sm font-semibold text-clay-dark">
            {error}
          </p>
        )}
        {serverErrors.length > 0 && (
          <ul
            role="alert"
            className="mb-4 space-y-1 rounded-xl bg-clay-soft p-4 text-sm font-semibold text-clay-dark"
          >
            {serverErrors.map((rowError, index) => (
              <li key={`${rowError.row}-${rowError.field}-${index}`}>
                {t("import.rowN", { line: rowError.row })} · {rowError.field}:{" "}
                {rowError.message}
              </li>
            ))}
          </ul>
        )}
        {overLimit && limits.plan && (
          <div className="mb-4 space-y-2">
            <p role="alert" className="text-sm font-semibold text-clay-dark">
              {overLimit}
            </p>
            <UpgradePrompt limitKey={PLAN_LIMIT.Products} plan={limits.plan} />
          </div>
        )}
        {loaded ? (
          <ImportPreview
            fileName={loaded.name}
            rows={loaded.rows}
            ignoredColumns={loaded.ignoredColumns}
            existingNames={existingNames}
            onRowsChange={(rows) => {
              setServerErrors([]);
              setLoaded({ ...loaded, rows });
            }}
            onImport={handleImport}
            onReset={() => setLoaded(null)}
          />
        ) : (
          <ImportDropzone onFile={handleFile} reading={reading} error={error} />
        )}
      </div>
    </>
  );
}
