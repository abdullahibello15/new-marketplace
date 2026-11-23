import type {
  CreateProductInput,
  ProductImportRowError,
  VendorProductResource as ApiProduct,
} from "@zamani/contracts";
import { apiRequest } from "../../../services/apiClient";
import type {
  NewProductInput,
  Product,
} from "../../../types/marketplace";

export type { ProductImportRowError };

export interface ProductImportRow {
  sourceRow: number;
  product: NewProductInput;
}

function toProduct(record: ApiProduct): Product {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    description: record.description,
    price: record.priceKobo / 100,
    stock: record.stock,
    lowStockThreshold: record.lowStockThreshold,
    images: [],
    available: record.published,
  };
}

/** `images` is sent only when present, and the API rejects it until file storage exists. */
function toApiProduct(
  product: NewProductInput,
): CreateProductInput & { images?: string[] } {
  return {
    name: product.name,
    category: product.category,
    description: product.description,
    priceKobo: Math.round(product.price * 100),
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    published: product.available,
    ...(product.images.length > 0 ? { images: product.images } : {}),
  };
}

export async function listVendorProducts(): Promise<Product[]> {
  const rows = await apiRequest<ApiProduct[]>("/v1/vendors/me/products");
  return rows.map(toProduct);
}

export async function createVendorProduct(
  product: NewProductInput,
): Promise<Product> {
  const created = await apiRequest<ApiProduct>("/v1/vendors/me/products", {
    method: "POST",
    body: JSON.stringify(toApiProduct(product)),
  });
  return toProduct(created);
}

export async function updateVendorProduct(
  productId: string,
  product: NewProductInput,
): Promise<Product> {
  const updated = await apiRequest<ApiProduct>(
    `/v1/vendors/me/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(toApiProduct(product)),
    },
  );
  return toProduct(updated);
}

export async function deleteVendorProduct(productId: string): Promise<void> {
  await apiRequest<void>(
    `/v1/vendors/me/products/${encodeURIComponent(productId)}`,
    { method: "DELETE" },
  );
}

export async function importVendorProducts(
  rows: ProductImportRow[],
): Promise<Product[]> {
  const created = await apiRequest<ApiProduct[]>(
    "/v1/vendors/me/products/import",
    {
      method: "POST",
      body: JSON.stringify(
        rows.map(({ sourceRow, product }) => ({
          sourceRow,
          product: toApiProduct(product),
        })),
      ),
    },
  );
  return created.map(toProduct);
}
