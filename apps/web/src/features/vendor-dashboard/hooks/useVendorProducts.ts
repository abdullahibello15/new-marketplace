import { useCallback } from "react";
import { useVendors } from "../../../contexts/VendorsContext";
import { useAsyncData } from "../../../hooks/useAsyncData";
import type { NewProductInput, Product } from "../../../types/marketplace";
import { useCurrentVendor } from "../../auth/hooks/useCurrentVendor";
import {
  createVendorProduct,
  deleteVendorProduct,
  importVendorProducts,
  listVendorProducts,
  updateVendorProduct,
  type ProductImportRow,
} from "../services/vendorProductsApi";

export function useVendorProducts() {
  const { vendor, vendorId, live } = useCurrentVendor();
  const { updateVendorProfile } = useVendors();
  const load = useCallback(
    () =>
      live ? listVendorProducts() : Promise.resolve(vendor?.products ?? []),
    [live, vendor?.products],
  );
  const { data, status, error, reload, setData } = useAsyncData(load);
  const products = data ?? [];

  const saveMockProducts = (next: Product[]) => {
    if (!live && vendorId) updateVendorProfile(vendorId, { products: next });
    setData(() => next);
  };

  async function create(input: NewProductInput) {
    const product = live
      ? await createVendorProduct(input)
      : { ...input, id: `p${Date.now()}` };
    if (!live) saveMockProducts([product, ...products]);
    else setData((current) => [product, ...current]);
    return product;
  }

  async function update(productId: string, input: NewProductInput) {
    const updated = live
      ? await updateVendorProduct(productId, input)
      : { ...input, id: productId };
    if (!live)
      saveMockProducts(
        products.map((product) =>
          product.id === productId ? updated : product,
        ),
      );
    else
      setData((current) =>
        current.map((product) =>
          product.id === productId ? updated : product,
        ),
      );
    return updated;
  }

  async function remove(productId: string) {
    if (live) await deleteVendorProduct(productId);
    saveMockProducts(products.filter((product) => product.id !== productId));
  }

  async function importRows(rows: ProductImportRow[]) {
    const created = live
      ? await importVendorProducts(rows)
      : rows.map(({ product }, index) => ({
          ...product,
          id: `p${Date.now()}-${index}`,
        }));
    if (!live) saveMockProducts([...created, ...products]);
    else setData((current) => [...created, ...current]);
    return created;
  }

  return {
    products,
    status,
    error,
    reload,
    create,
    update,
    remove,
    importRows,
    live,
  };
}
