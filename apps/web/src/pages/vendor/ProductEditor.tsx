import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { ProductForm } from "../../components/vendor/ProductForm";
import { PLAN_LIMIT } from "../../features/vendor-dashboard/constants";
import { UpgradePrompt } from "../../features/vendor-dashboard/components/subscription/UpgradePrompt";
import { usePlanLimits } from "../../features/vendor-dashboard/hooks/usePlanLimits";
import { NotFound } from "../NotFound";
import { useCurrentVendor } from "../../features/auth/hooks/useCurrentVendor";
import { useVendorProducts } from "../../features/vendor-dashboard/hooks/useVendorProducts";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";

const LIST = "/pro/catalogue/products";

/** Add (/pro/catalogue/products/new) or edit (/pro/catalogue/products/:productId) one product. */
export function ProductEditor() {
  const { t } = useTranslation("vendor");
  const { productId } = useParams();
  const navigate = useNavigate();
  const { vendor, live } = useCurrentVendor();
  const { products, status, error, reload, create, update, remove } =
    useVendorProducts();
  const product = productId
    ? products.find((p) => p.id === productId)
    : undefined;
  const limits = usePlanLimits();

  if (!vendor) return <NotFound message={t("profile.notFoundTitle")} />;
  if (status === "loading")
    return (
      <LoadingState
        label={t("products.loading")}
        rows={2}
        rowClassName="h-24"
      />
    );
  if (status === "error")
    return <ErrorState message={error ?? ""} onRetry={reload} />;
  if (productId && !product)
    return <NotFound message={t("products.notFound")} />;

  const done = (notice: string) => navigate(LIST, { state: { notice } });

  return (
    <>
      <PageHeader
        title={product ? t("products.editTitle") : t("products.add")}
        subtitle={product?.name ?? vendor?.name ?? ""}
        backTo={{ to: LIST, label: t("products.title") }}
      />

      <div className="mx-auto max-w-3xl px-5 py-6 lg:px-10 lg:py-8">
        {!product &&
        limits.plan &&
        limits.reached(PLAN_LIMIT.Products, products.length) ? (
          <UpgradePrompt limitKey={PLAN_LIMIT.Products} plan={limits.plan} />
        ) : (
          <ProductForm
            key={product?.id ?? "new"}
            initial={product}
            live={live}
            cancelTo={LIST}
            onSave={async (input) => {
              if (product) {
                await update(product.id, input);
                done(t("products.savedNotice", { name: input.name }));
              } else {
                await create(input);
                done(t("products.addedNotice", { name: input.name }));
              }
            }}
            onDelete={
              product
                ? async () => {
                    await remove(product.id);
                    done(t("products.deleted", { name: product.name }));
                  }
                : undefined
            }
          />
        )}
      </div>
    </>
  );
}
