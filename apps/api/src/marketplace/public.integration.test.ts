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
  reviews,
  sessions,
  userRoles,
  users,
  vendorProducts,
  vendors,
} from "../db/schema/index.js";
import { createLogger } from "../observability/logger.js";
import {
  PUBLIC_MARKETPLACE_RATE_LIMIT,
  PUBLIC_MARKETPLACE_RATE_WINDOW_SECONDS,
} from "./publicService.js";

const ORIGIN = "https://web.example.test";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
let container: StartedPostgreSqlContainer;
let db: Db;
let connection: ReturnType<typeof createDb>["sql"];
let app: ReturnType<typeof createApp>;
let rateLimiter: MemoryRateLimiter;

async function addVendor(
  name: string,
  options: {
    status?: "pending" | "active" | "suspended";
    services?: unknown[];
    town?: string;
    lga?: string;
  } = {},
) {
  const id = crypto.randomUUID();
  const accessToken = randomBytes(32).toString("base64url");
  await db
    .insert(users)
    .values({ id, name, email: `${id}@example.test`, activeRole: "provider" });
  await db.insert(userRoles).values({ userId: id, role: "provider" });
  await db.insert(sessions).values({
    userId: id,
    refreshTokenHash: hash(`refresh-${id}`),
    accessTokenHash: hash(accessToken),
    accessExpiresAt: new Date(Date.now() + 60 * 60_000),
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
  });
  const [vendor] = await db
    .insert(vendors)
    .values({
      ownerUserId: id,
      businessName: name,
      kind: "service",
      tradeCategory: "plumber",
      town: options.town ?? "Tunga",
      lga: options.lga ?? "Agwara",
      status: options.status ?? "active",
      verificationStatus: "unverified",
      profileData: {
        bio: "b".repeat(350),
        photo: "/private/local.jpg",
        gallery: [
          "https://images.example.test/work.jpg",
          "javascript:alert(1)",
          "storage://vendor/work-2.jpg",
        ],
        coordinates: { lat: 9.616253, lng: 6.556748 },
        services: options.services ?? [
          {
            id: "svc1",
            name: "Pipe repair",
            minPrice: 2500,
            maxPrice: 8000,
            description: "Repairs",
            duration: "1 hour",
          },
        ],
        serviceAreas: ["Agwara", "Bosso"],
        workingHours: {
          mon: { open: true, opensAt: "08:00", closesAt: "18:00" },
        },
        phone: "+2348000000000",
        email: "private@example.test",
        documents: [{ secret: true }],
        completeness: 100,
      },
    })
    .returning();
  return { vendor, authorization: `Bearer ${accessToken}` };
}

async function addProduct(vendorId: string, name: string, published: boolean) {
  const [product] = await db
    .insert(vendorProducts)
    .values({
      vendorId,
      name,
      category: "tools",
      description: "Product description",
      priceKobo: 125_000,
      stock: 4,
      lowStockThreshold: 1,
      published,
    })
    .returning();
  return product;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgis/postgis:16-3.5").start();
  ({ db, sql: connection } = createDb(container.getConnectionUri()));
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
  await connection?.end();
  await container?.stop();
});

describe("public marketplace API", () => {
  it("serves public routes unauthenticated and preserves the authenticated /me route", async () => {
    const vendorsResponse = await app.inject({
      method: "GET",
      url: "/v1/vendors",
    });
    const productsResponse = await app.inject({
      method: "GET",
      url: "/v1/products",
    });
    const profileResponse = await app.inject({
      method: "GET",
      url: "/v1/vendors/me",
    });
    expect(vendorsResponse.statusCode).toBe(200);
    expect(productsResponse.statusCode).toBe(200);
    expect(profileResponse.statusCode).toBe(401);
    expect(vendorsResponse.headers["cache-control"]).toContain("max-age=30");
  });

  it("returns an explicit public DTO with exact keys and safe media and coordinates", async () => {
    const { vendor, authorization } = await addVendor("Safe DTO Plumbing");
    await addProduct(vendor.id, "Public Pipe Wrench", true);
    const response = await app.inject({
      method: "GET",
      url: `/v1/vendors/${vendor.id}`,
    });
    expect(response.statusCode, response.body).toBe(200);
    const body = response.json();
    expect(Object.keys(body)).toEqual(["vendor", "products", "kind"]);
    expect(Object.keys(body.vendor)).toEqual([
      "id",
      "businessName",
      "kind",
      "tradeCategory",
      "town",
      "lga",
      "photo",
      "gallery",
      "bio",
      "serviceAreas",
      "coordinates",
      "services",
      "workingHours",
      "fulfilment",
      "acceptsCash",
      "verified",
      "rating",
      "reviewCount",
      "priceFrom",
      "priceTo",
    ]);
    expect(Object.keys(body.products[0])).toEqual([
      "id",
      "name",
      "category",
      "description",
      "priceKobo",
      "stock",
      "lowStockThreshold",
      "images",
      "available",
    ]);
    expect(body.vendor).toMatchObject({
      id: vendor.id,
      businessName: "Safe DTO Plumbing",
      photo: null,
      gallery: [
        "https://images.example.test/work.jpg",
        "storage://vendor/work-2.jpg",
      ],
      coordinates: { lat: 9.62, lng: 6.56 },
      rating: null,
      reviewCount: 0,
      verified: false,
    });
    expect(body.vendor.bio).toHaveLength(300);
    expect(JSON.stringify(body)).not.toMatch(
      /ownerUserId|profileData|phone|email|documents|completeness|verificationStatus|status/,
    );

    const invalidGallery = await app.inject({
      method: "PATCH",
      url: "/v1/vendors/me",
      headers: { authorization },
      payload: { gallery: ["javascript:alert(1)"] },
    });
    const oversizedBio = await app.inject({
      method: "PATCH",
      url: "/v1/vendors/me",
      headers: { authorization },
      payload: { bio: "x".repeat(301) },
    });
    expect(invalidGallery.statusCode).toBe(400);
    expect(oversizedBio.statusCode).toBe(400);

    const listing = await app.inject({ method: "GET", url: "/v1/products" });
    expect(Object.keys(listing.json().items[0])).toEqual(["product", "shop"]);
    expect(Object.keys(listing.json().items[0].shop)).toEqual(
      Object.keys(body.vendor),
    );
  });

  it("hides pending vendors, unpublished products, and vendors without a priced service or published product", async () => {
    const pending = await addVendor("Pending Plumber", { status: "pending" });
    const inactiveProduct = await addVendor("Draft Product Shop", {
      services: [],
    });
    const product = await addProduct(
      inactiveProduct.vendor.id,
      "Draft wrench",
      false,
    );
    const active = await addVendor("Published Product Shop", { services: [] });
    const published = await addProduct(
      active.vendor.id,
      "Published wrench",
      true,
    );
    const vendorList = await app.inject({ method: "GET", url: "/v1/vendors" });
    const productList = await app.inject({
      method: "GET",
      url: "/v1/products",
    });
    const vendorIds = vendorList
      .json()
      .items.map((item: { id: string }) => item.id);
    const productIds = productList
      .json()
      .items.map((item: { product: { id: string } }) => item.product.id);
    expect(vendorIds).not.toContain(pending.vendor.id);
    expect(vendorIds).not.toContain(inactiveProduct.vendor.id);
    expect(vendorIds).toContain(active.vendor.id);
    expect(productIds).not.toContain(product.id);
    expect(productIds).toContain(published.id);
  });

  it("filters by text, category, town and LGA and paginates with a maximum page size of 50", async () => {
    const first = await addVendor("North Pipe Works", {
      town: "TungaQ",
      lga: "AgwaraQ",
    });
    const second = await addVendor("South Pipe Works", {
      town: "KpakunguQ",
      lga: "BossoQ",
    });
    await addProduct(first.vendor.id, "North wrench", true);
    await addProduct(second.vendor.id, "South wrench", true);
    const textFilter = await app.inject({
      method: "GET",
      url: "/v1/vendors?q=North&category=plumber",
    });
    const townFilter = await app.inject({
      method: "GET",
      url: "/v1/vendors?town=TungaQ",
    });
    const lgaFilter = await app.inject({
      method: "GET",
      url: "/v1/vendors?lga=BossoQ",
    });
    const page = await app.inject({
      method: "GET",
      url: "/v1/vendors?page=1&pageSize=1",
    });
    const tooLarge = await app.inject({
      method: "GET",
      url: "/v1/vendors?pageSize=51",
    });
    const wildcard = await app.inject({
      method: "GET",
      url: "/v1/vendors?q=%25",
    });
    const productFilter = await app.inject({
      method: "GET",
      url: "/v1/products?q=North&category=tools&town=TungaQ&lga=AgwaraQ",
    });
    const longQuery = await app.inject({
      method: "GET",
      url: `/v1/vendors?q=${"a".repeat(101)}`,
    });
    expect(
      textFilter.json().items.map((item: { id: string }) => item.id),
    ).toContain(first.vendor.id);
    expect(townFilter.json().items).toHaveLength(1);
    expect(lgaFilter.json().items).toHaveLength(1);
    expect(page.json()).toMatchObject({ page: 1, pageSize: 1, hasMore: true });
    expect(tooLarge.statusCode).toBe(400);
    expect(wildcard.json().items).toHaveLength(0);
    expect(productFilter.json().items).toHaveLength(1);
    expect(productFilter.json().items[0].product.name).toBe("North wrench");
    expect(longQuery.statusCode).toBe(400);
  });

  it("removes suspended vendors and their products from public results", async () => {
    const { vendor } = await addVendor("Soon Suspended Shop");
    const product = await addProduct(vendor.id, "Soon hidden product", true);
    await db
      .update(vendors)
      .set({ status: "suspended" })
      .where(eq(vendors.id, vendor.id));
    const vendorResult = await app.inject({
      method: "GET",
      url: `/v1/vendors/${vendor.id}`,
    });
    const productResult = await app.inject({
      method: "GET",
      url: `/v1/products/${product.id}`,
    });
    const list = await app.inject({ method: "GET", url: "/v1/products" });
    expect(vendorResult.statusCode).toBe(404);
    expect(productResult.statusCode).toBe(404);
    expect(
      list
        .json()
        .items.some(
          (item: { product: { id: string } }) => item.product.id === product.id,
        ),
    ).toBe(false);
  });

  it("computes public ratings from published reviews only", async () => {
    const { vendor } = await addVendor("Review Summary Plumbing");
    await db.insert(reviews).values([
      {
        vendorId: vendor.id,
        rating: 5,
        comment: "Published review",
        status: "published",
      },
      {
        vendorId: vendor.id,
        rating: 3,
        comment: "Another published review",
        status: "published",
      },
      {
        vendorId: vendor.id,
        rating: 1,
        comment: "Hidden review",
        status: "hidden",
      },
    ]);
    const response = await app.inject({
      method: "GET",
      url: `/v1/vendors/${vendor.id}`,
    });
    expect(response.json().vendor).toMatchObject({ rating: 4, reviewCount: 2 });
    const reviewList = await app.inject({
      method: "GET",
      url: `/v1/vendors/${vendor.id}/reviews`,
    });
    expect(reviewList.json().items).toHaveLength(2);
    expect(reviewList.json().summary).toMatchObject({
      rating: 4,
      reviewCount: 2,
    });
  });

  it("returns 404 for malformed public UUIDs and caps public rate limits only", async () => {
    expect(
      (await app.inject({ method: "GET", url: "/v1/vendors/not-a-uuid" }))
        .statusCode,
    ).toBe(404);
    expect(
      (await app.inject({ method: "GET", url: "/v1/products/not-a-uuid" }))
        .statusCode,
    ).toBe(404);
    expect(PUBLIC_MARKETPLACE_RATE_LIMIT).toBe(120);
    expect(PUBLIC_MARKETPLACE_RATE_WINDOW_SECONDS).toBe(60);
  });

  it("limits public reads to 120 requests per IP per minute", async () => {
    for (
      let requestNumber = 0;
      requestNumber < PUBLIC_MARKETPLACE_RATE_LIMIT;
      requestNumber += 1
    ) {
      const response = await app.inject({
        method: "GET",
        url: "/v1/vendors",
        remoteAddress: "192.0.2.120",
      });
      expect(response.statusCode).toBe(200);
    }
    const limited = await app.inject({
      method: "GET",
      url: "/v1/vendors",
      remoteAddress: "192.0.2.120",
    });
    expect(limited.statusCode).toBe(429);
    const me = await app.inject({
      method: "GET",
      url: "/v1/vendors/me",
      remoteAddress: "192.0.2.120",
    });
    expect(me.statusCode).toBe(401);
  });
});
