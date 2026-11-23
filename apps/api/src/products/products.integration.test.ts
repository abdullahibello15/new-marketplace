import { createHash, randomBytes } from "node:crypto";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "../auth/service.js";
import { createApp } from "../app.js";
import { createDb, type Db } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import {
  vendorProducts,
  userRoles,
  users,
  vendors,
  sessions,
} from "../db/schema/index.js";
import { createLogger } from "../observability/logger.js";
import {
  listPublicProducts,
  MAX_PRODUCT_IMPORT_ROWS,
  PRODUCT_WRITE_LIMIT,
} from "./service.js";

const ORIGIN = "https://web.example.test";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
let container: StartedPostgreSqlContainer;
let db: Db;
let sql: ReturnType<typeof createDb>["sql"];
let app: ReturnType<typeof createApp>;
let rateLimiter: MemoryRateLimiter;

async function account(role: "provider" | "customer" = "provider") {
  const id = crypto.randomUUID();
  const accessToken = randomBytes(32).toString("base64url");
  const [user] = await db
    .insert(users)
    .values({
      id,
      name: `Product Test ${id.slice(0, 6)}`,
      email: `${id}@example.test`,
      activeRole: role,
      providerSignup:
        role === "provider"
          ? {
              lga: "Agwara",
              town: "Tunga",
              termsAcceptedAt: new Date().toISOString(),
            }
          : null,
    })
    .returning();
  await db.insert(userRoles).values({ userId: id, role });
  await db.insert(sessions).values({
    userId: id,
    refreshTokenHash: hash(`refresh-${id}`),
    accessTokenHash: hash(accessToken),
    accessExpiresAt: new Date(Date.now() + 60 * 60_000),
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
  });
  return { user, authorization: `Bearer ${accessToken}` };
}

async function providerWithVendor(name: string) {
  const provider = await account();
  const setup = await app.inject({
    method: "POST",
    url: "/v1/vendors/setup",
    headers: { authorization: provider.authorization },
    payload: { kind: "retail", businessName: name, tradeCategory: "grocer" },
  });
  expect(setup.statusCode).toBe(201);
  return { ...provider, vendorId: setup.json().vendorId as string };
}

const createPayload = {
  name: "Rice bag 5kg",
  category: "building_materials",
  description: "A stock item",
  priceKobo: 750_000,
  stock: 12,
  lowStockThreshold: 3,
  published: false,
};

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgis/postgis:16-3.5").start();
  ({ db, sql } = createDb(container.getConnectionUri()));
  await runMigrations(db);
  rateLimiter = new MemoryRateLimiter();
  app = createApp({
    logger: createLogger({ level: "silent" }),
    webOrigin: ORIGIN,
    healthChecks: {
      postgres: () => Promise.resolve(),
      redis: () => Promise.resolve(),
    },
    auth: {
      db,
      rateLimiter,
      origin: ORIGIN,
      production: true,
      testOtp: false,
      delivery: { send: async () => undefined },
    },
  });
});

afterAll(async () => {
  await app?.close();
  await sql?.end();
  await container?.stop();
});

describe("vendor product API", () => {
  it("allows only provider-role accounts to access vendor products", async () => {
    const customer = await account("customer");
    const provider = await providerWithVendor("Provider Product Shop");
    const anonymous = await app.inject({
      method: "GET",
      url: "/v1/vendors/me/products",
    });
    const customerRead = await app.inject({
      method: "GET",
      url: "/v1/vendors/me/products",
      headers: { authorization: customer.authorization },
    });
    const customerWrite = await app.inject({
      method: "POST",
      url: "/v1/vendors/me/products",
      headers: { authorization: customer.authorization },
      payload: createPayload,
    });
    const providerRead = await app.inject({
      method: "GET",
      url: "/v1/vendors/me/products",
      headers: { authorization: provider.authorization },
    });
    expect(anonymous.statusCode).toBe(401);
    expect(customerRead.statusCode).toBe(403);
    expect(customerWrite.statusCode).toBe(403);
    expect(providerRead.statusCode).toBe(200);
    expect(providerRead.json()).toEqual([]);
  });

  it("prevents one vendor from reading, editing or deleting another vendor product", async () => {
    const owner = await providerWithVendor("Owner Product Shop");
    const other = await providerWithVendor("Other Product Shop");
    const created = await app.inject({
      method: "POST",
      url: "/v1/vendors/me/products",
      headers: { authorization: other.authorization },
      payload: createPayload,
    });
    expect(created.statusCode).toBe(201);
    const productId = created.json().id as string;

    const ownerProducts = await app.inject({
      method: "GET",
      url: "/v1/vendors/me/products",
      headers: { authorization: owner.authorization },
    });
    const read = await app.inject({
      method: "GET",
      url: `/v1/vendors/me/products/${productId}`,
      headers: { authorization: owner.authorization },
    });
    const edit = await app.inject({
      method: "PATCH",
      url: `/v1/vendors/me/products/${productId}`,
      headers: { authorization: owner.authorization },
      payload: { name: "Taken over" },
    });
    const remove = await app.inject({
      method: "DELETE",
      url: `/v1/vendors/me/products/${productId}`,
      headers: { authorization: owner.authorization },
    });
    expect(ownerProducts.json()).toEqual([]);
    expect(read.statusCode).toBe(404);
    expect(edit.statusCode).toBe(404);
    expect(remove.statusCode).toBe(404);
    const [unchanged] = await db
      .select()
      .from(vendorProducts)
      .where(eq(vendorProducts.id, productId));
    expect(unchanged).toMatchObject({
      vendorId: other.vendorId,
      name: createPayload.name,
    });
  });

  it("validates product fields and accepts only integer kobo prices within the limit", async () => {
    const provider = await providerWithVendor("Price Limit Shop");
    const invalidBodies = [
      { ...createPayload, name: " " },
      { ...createPayload, category: "unknown_category" },
      { ...createPayload, priceKobo: 1.5 },
      { ...createPayload, priceKobo: 0 },
      { ...createPayload, priceKobo: 10_000_000_001 },
      { ...createPayload, stock: -1 },
      {
        ...createPayload,
        images: ["data:image/png;base64,not-accepted-in-phase-2a"],
      },
    ];
    for (const payload of invalidBodies) {
      const response = await app.inject({
        method: "POST",
        url: "/v1/vendors/me/products",
        headers: { authorization: provider.authorization },
        payload,
      });
      expect(response.statusCode).toBe(400);
    }
    const valid = await app.inject({
      method: "POST",
      url: "/v1/vendors/me/products",
      headers: { authorization: provider.authorization },
      payload: { ...createPayload, priceKobo: 10_000_000_000 },
    });
    expect(valid.statusCode).toBe(201);
    expect(valid.json()).toMatchObject({
      priceKobo: 10_000_000_000,
      published: false,
    });

    const defaultPublished = await app.inject({
      method: "POST",
      url: "/v1/vendors/me/products",
      headers: { authorization: provider.authorization },
      payload: { ...createPayload, published: undefined },
    });
    expect(defaultPublished.statusCode).toBe(201);
    expect(defaultPublished.json().published).toBe(false);
  });

  it("rejects unauthenticated imports and batches above the 100-row cap", async () => {
    const provider = await providerWithVendor("Import Cap Shop");
    const row = { sourceRow: 2, product: createPayload };
    const anonymous = await app.inject({
      method: "POST",
      url: "/v1/vendors/me/products/import",
      payload: [row],
    });
    const overLimit = await app.inject({
      method: "POST",
      url: "/v1/vendors/me/products/import",
      headers: { authorization: provider.authorization },
      payload: Array.from(
        { length: MAX_PRODUCT_IMPORT_ROWS + 1 },
        (_, index) => ({
          sourceRow: index + 2,
          product: { ...createPayload, name: `Item ${index}` },
        }),
      ),
    });
    expect(anonymous.statusCode).toBe(401);
    expect(overLimit.statusCode).toBe(400);
  });

  it("returns row-indexed validation errors and inserts nothing if one import row is invalid", async () => {
    const provider = await providerWithVendor("Atomic Import Shop");
    const before = await db
      .select()
      .from(vendorProducts)
      .where(eq(vendorProducts.vendorId, provider.vendorId));
    const response = await app.inject({
      method: "POST",
      url: "/v1/vendors/me/products/import",
      headers: { authorization: provider.authorization },
      payload: [
        { sourceRow: 4, product: { ...createPayload, name: "Valid row" } },
        {
          sourceRow: 7,
          product: {
            ...createPayload,
            name: "x".repeat(81),
            description: "d".repeat(501),
            priceKobo: 10_000_000_001,
          },
        },
      ],
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.details.rowErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 7, field: "name" }),
        expect.objectContaining({ row: 7, field: "description" }),
        expect.objectContaining({ row: 7, field: "priceKobo" }),
      ]),
    );
    const after = await db
      .select()
      .from(vendorProducts)
      .where(eq(vendorProducts.vendorId, provider.vendorId));
    expect(after).toHaveLength(before.length);
  });

  it("rejects duplicate product names in a batch and inserts no rows", async () => {
    const provider = await providerWithVendor("Duplicate Import Shop");
    const response = await app.inject({
      method: "POST",
      url: "/v1/vendors/me/products/import",
      headers: { authorization: provider.authorization },
      payload: [
        { sourceRow: 2, product: { ...createPayload, name: "Same product" } },
        { sourceRow: 3, product: { ...createPayload, name: " same PRODUCT " } },
      ],
    });
    expect(response.statusCode).toBe(422);
    expect(
      response
        .json()
        .error.details.rowErrors.map((error: { row: number }) => error.row),
    ).toEqual([3, 2]);
    const stored = await db
      .select()
      .from(vendorProducts)
      .where(eq(vendorProducts.vendorId, provider.vendorId));
    expect(stored).toEqual([]);
  });

  it("rate limits provider product writes", async () => {
    const provider = await providerWithVendor("Rate Limited Shop");
    const created = await app.inject({
      method: "POST",
      url: "/v1/vendors/me/products",
      headers: { authorization: provider.authorization },
      payload: createPayload,
    });
    expect(created.statusCode).toBe(201);
    const productId = created.json().id as string;
    const results = [];
    for (let attempt = 0; attempt < PRODUCT_WRITE_LIMIT + 1; attempt += 1) {
      results.push(
        await app.inject({
          method: "PATCH",
          url: `/v1/vendors/me/products/${productId}`,
          headers: { authorization: provider.authorization },
          payload: { description: `Update ${attempt}` },
        }),
      );
    }
    expect(
      results
        .slice(0, PRODUCT_WRITE_LIMIT - 1)
        .every((result) => result.statusCode === 200),
    ).toBe(true);
    expect(results.at(-1)?.statusCode).toBe(429);
  });

  it("excludes unpublished and pending-vendor products from the public product query", async () => {
    const pending = await providerWithVendor("Pending Product Shop");
    const active = await providerWithVendor("Active Product Shop");
    const pendingProduct = await app.inject({
      method: "POST",
      url: "/v1/vendors/me/products",
      headers: { authorization: pending.authorization },
      payload: { ...createPayload, published: true },
    });
    const activeDraft = await app.inject({
      method: "POST",
      url: "/v1/vendors/me/products",
      headers: { authorization: active.authorization },
      payload: createPayload,
    });
    const activePublished = await app.inject({
      method: "POST",
      url: "/v1/vendors/me/products",
      headers: { authorization: active.authorization },
      payload: { ...createPayload, published: true },
    });
    expect(pendingProduct.statusCode).toBe(201);
    expect(activeDraft.statusCode).toBe(201);
    expect(activePublished.statusCode).toBe(201);
    await db
      .update(vendors)
      .set({ status: "active" })
      .where(eq(vendors.id, active.vendorId));

    const visible = await listPublicProducts(db);
    expect(visible.map((product) => product.id)).toContain(
      activePublished.json().id,
    );
    expect(visible.map((product) => product.id)).not.toContain(
      activeDraft.json().id,
    );
    expect(visible.map((product) => product.id)).not.toContain(
      pendingProduct.json().id,
    );
  });
});
