import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../services/mockApi";
import { apiRequest, setApiAccessToken } from "../../../services/apiClient";
import {
  createVendorProduct,
  deleteVendorProduct,
  importVendorProducts,
  listVendorProducts,
  updateVendorProduct,
} from "./vendorProductsApi";

const input = {
  name: "Pipe wrench",
  category: "tools" as const,
  price: 1250,
  description: "Steel wrench",
  stock: 8,
  lowStockThreshold: 2,
  images: [],
  available: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
  setApiAccessToken(null);
});

describe("vendorProductsApi", () => {
  it("maps kobo and published state to the Catalogue product shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "product-1",
              name: input.name,
              category: input.category,
              description: input.description,
              priceKobo: 125000,
              stock: 8,
              lowStockThreshold: 2,
              published: true,
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(listVendorProducts()).resolves.toEqual([
      {
        id: "product-1",
        name: input.name,
        category: input.category,
        description: input.description,
        price: 1250,
        stock: 8,
        lowStockThreshold: 2,
        images: [],
        available: true,
      },
    ]);
  });

  it("uses the existing CRUD routes and sends prices as integer kobo with published state", async () => {
    const product = {
      id: "product-1",
      name: input.name,
      category: input.category,
      description: input.description,
      priceKobo: 125000,
      stock: 8,
      lowStockThreshold: 2,
      published: false,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(product), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(product), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await createVendorProduct(input);
    await updateVendorProduct("product-1", input);
    await deleteVendorProduct("product-1");

    expect(
      fetchMock.mock.calls.map(([url, init]) => [url, init?.method]),
    ).toEqual([
      ["/v1/vendors/me/products", "POST"],
      ["/v1/vendors/me/products/product-1", "PATCH"],
      ["/v1/vendors/me/products/product-1", "DELETE"],
    ]);
    expect(
      JSON.parse(fetchMock.mock.calls[0][1]?.body as string),
    ).toMatchObject({ priceKobo: 125000, published: false });
  });

  it("sends source row numbers and keeps server row errors in ApiError.details", async () => {
    const rowErrors = [
      { row: 8, field: "priceKobo", message: "Price exceeds the limit." },
    ];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "validation_failed",
            message: "Fix the listed rows.",
            details: { rowErrors },
          },
        }),
        { status: 422, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rows = [
      { sourceRow: 8, product: { ...input, price: 1_000_000_001 } },
    ];
    const failure = importVendorProducts(rows);
    await expect(failure).rejects.toMatchObject({
      status: 422,
      details: { rowErrors },
    });
    expect(
      JSON.parse(fetchMock.mock.calls[0][1]?.body as string)[0].sourceRow,
    ).toBe(8);
  });

  it("preserves the existing ApiError message and status behavior for ordinary failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "unauthorized", message: "Sign in to continue." },
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const failure = apiRequest("/existing-route", {}, false);
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({
      name: "ApiError",
      message: "Sign in to continue.",
      status: 401,
      details: undefined,
    });
  });
});
