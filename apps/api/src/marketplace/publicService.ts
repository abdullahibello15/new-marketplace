import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { publicListQuerySchema as querySchema, publicProductQuerySchema as productQuerySchema } from "@zamani/contracts";
import type { RateLimiter } from "../auth/service.js";
import type { Db } from "../db/client.js";
import { reviews, vendorProducts, vendors } from "../db/schema/index.js";
import { AppError } from "../http/errors.js";

const PUBLIC_RATE_LIMIT = 120;
const PUBLIC_RATE_WINDOW_SECONDS = 60;
const BIO_MAX_LENGTH = 300;
const uuidSchema = z.string().uuid();

type PublicRouteOptions = { db: Db; rateLimiter: RateLimiter };
type VendorRow = typeof vendors.$inferSelect;
type ProductRow = typeof vendorProducts.$inferSelect;
type PublicSummary = {
  rating: number | null;
  reviewCount: number;
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Backslash-escape SQL LIKE metacharacters. The resulting pattern is still bound as a parameter. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");
const queryPattern = (value: string) => `%${escapeLike(value)}%`;

function validImageReference(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (/^https:\/\/[^\s<>"']+$/i.test(value)) return true;
  return /^storage:\/\/[A-Za-z0-9][A-Za-z0-9._/-]{0,2040}$/.test(value);
}

function safeImages(profile: Record<string, unknown>): {
  photo: string | null;
  gallery: string[];
} {
  const photo = validImageReference(profile.photo) ? profile.photo : null;
  const raw = Array.isArray(profile.gallery) ? profile.gallery : [];
  return { photo, gallery: raw.filter(validImageReference).slice(0, 10) };
}

function publicCoordinates(
  value: unknown,
): { lat: number; lng: number } | null {
  const point = asRecord(value);
  const lat = point.lat;
  const lng = point.lng;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  )
    return null;
  return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
}

function publicServices(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    const service = asRecord(raw);
    const minPrice = Number(service.minPrice);
    const maxPrice = Number(service.maxPrice);
    if (
      typeof service.name !== "string" ||
      !service.name.trim() ||
      !Number.isFinite(minPrice) ||
      minPrice <= 0 ||
      !Number.isFinite(maxPrice) ||
      maxPrice < minPrice
    )
      return [];
    return [
      {
        id: typeof service.id === "string" ? service.id : "",
        name: service.name.slice(0, 100),
        description:
          typeof service.description === "string"
            ? service.description.slice(0, 500)
            : "",
        minPrice,
        maxPrice,
        duration:
          typeof service.duration === "string"
            ? service.duration.slice(0, 80)
            : "",
        photo: validImageReference(service.photo) ? service.photo : null,
      },
    ];
  });
}

function publicWorkingHours(value: unknown) {
  const raw = asRecord(value);
  const result: Record<
    string,
    { open: boolean; opensAt: string; closesAt: string }
  > = {};
  for (const day of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]) {
    const hours = asRecord(raw[day]);
    if (
      typeof hours.open !== "boolean" ||
      typeof hours.opensAt !== "string" ||
      typeof hours.closesAt !== "string"
    )
      continue;
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.opensAt) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.closesAt)
    )
      continue;
    result[day] = {
      open: hours.open,
      opensAt: hours.opensAt,
      closesAt: hours.closesAt,
    };
  }
  return result;
}

function publicFulfilment(value: unknown) {
  const raw = asRecord(value);
  const pickup = asRecord(raw.pickup);
  const delivery = asRecord(raw.delivery);
  const safePickup =
    typeof pickup.enabled === "boolean"
      ? {
          enabled: pickup.enabled,
          address:
            typeof pickup.address === "string"
              ? pickup.address.slice(0, 200)
              : "",
          instructions:
            typeof pickup.instructions === "string"
              ? pickup.instructions.slice(0, 300)
              : "",
        }
      : null;
  const safeDelivery =
    typeof delivery.enabled === "boolean"
      ? {
          enabled: delivery.enabled,
          fee:
            typeof delivery.fee === "number" &&
            Number.isFinite(delivery.fee) &&
            delivery.fee >= 0
              ? delivery.fee
              : 0,
          areas: Array.isArray(delivery.areas)
            ? delivery.areas
                .filter((area): area is string => typeof area === "string")
                .slice(0, 50)
            : [],
        }
      : null;
  return safePickup || safeDelivery
    ? { pickup: safePickup, delivery: safeDelivery }
    : null;
}

function publicVendorDto(
  vendor: VendorRow,
  summary: PublicSummary,
  products: ProductRow[] = [],
) {
  const profile = asRecord(vendor.profileData);
  const services = publicServices(profile.services);
  const prices = [
    ...services.map((service) => service.minPrice),
    ...products.map((product) => product.priceKobo / 100),
  ];
  return {
    id: vendor.id,
    businessName: vendor.businessName,
    kind: vendor.kind,
    tradeCategory: vendor.tradeCategory,
    town: vendor.town,
    lga: vendor.lga,
    ...safeImages(profile),
    bio:
      typeof profile.bio === "string"
        ? profile.bio.slice(0, BIO_MAX_LENGTH)
        : "",
    serviceAreas: Array.isArray(profile.serviceAreas)
      ? profile.serviceAreas
          .filter(
            (area): area is string =>
              typeof area === "string" &&
              area.length <= 100 &&
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(area),
          )
          .slice(0, 50)
      : [],
    coordinates: publicCoordinates(profile.coordinates),
    services,
    workingHours: publicWorkingHours(profile.workingHours),
    fulfilment: publicFulfilment(profile.fulfilment),
    acceptsCash: profile.acceptsCash === true,
    verified: vendor.verificationStatus === "verified",
    rating: summary.rating,
    reviewCount: summary.reviewCount,
    priceFrom: prices.length ? Math.min(...prices) : null,
    priceTo: prices.length ? Math.max(...prices) : null,
  };
}

function publicProductDto(product: ProductRow) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    priceKobo: product.priceKobo,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    images: [],
    available: product.stock > 0,
  };
}

function hasPricedService() {
  return sql<boolean>`exists (
    select 1 from jsonb_array_elements(
      case when jsonb_typeof(${vendors.profileData}->'services') = 'array'
        then ${vendors.profileData}->'services' else '[]'::jsonb end
    ) as service
    where nullif(service->>'name', '') is not null
      and coalesce(service->>'minPrice', '') ~ '^[0-9]+([.][0-9]+)?$'
      and coalesce(service->>'maxPrice', '') ~ '^[0-9]+([.][0-9]+)?$'
      and case when coalesce(service->>'minPrice', '') ~ '^[0-9]+([.][0-9]+)?$'
        then (service->>'minPrice')::numeric > 0 else false end
      and case when coalesce(service->>'maxPrice', '') ~ '^[0-9]+([.][0-9]+)?$'
        and coalesce(service->>'minPrice', '') ~ '^[0-9]+([.][0-9]+)?$'
        then (service->>'maxPrice')::numeric >= (service->>'minPrice')::numeric else false end
  )`;
}

function hasPublishedProduct() {
  return sql<boolean>`exists (select 1 from ${vendorProducts} product where product.vendor_id = ${vendors.id} and product.published = true)`;
}

function publicationWhere() {
  return and(
    eq(vendors.status, "active"),
    sql`char_length(trim(${vendors.businessName})) between 2 and 80`,
    sql`char_length(trim(${vendors.tradeCategory})) > 0`,
    sql`char_length(trim(${vendors.town})) > 0`,
    sql`char_length(trim(${vendors.lga})) > 0`,
    or(hasPublishedProduct(), hasPricedService()),
  );
}

async function publicSummaries(db: Db, vendorIds: string[]) {
  const summaries = new Map<string, PublicSummary>();
  if (!vendorIds.length) return summaries;
  const rows = await db
    .select({
      vendorId: reviews.vendorId,
      star: reviews.rating,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.status, "published"),
        inArray(reviews.vendorId, vendorIds),
      ),
    )
    .groupBy(reviews.vendorId, reviews.rating);
  for (const row of rows) {
    const current = summaries.get(row.vendorId) ?? {
      rating: null,
      reviewCount: 0,
      counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
    current.counts[row.star as 1 | 2 | 3 | 4 | 5] = Number(row.count);
    current.reviewCount += Number(row.count);
    const weighted = Object.entries(current.counts).reduce(
      (sum, [star, count]) => sum + Number(star) * count,
      0,
    );
    current.rating = Math.round((weighted / current.reviewCount) * 10) / 10;
    summaries.set(row.vendorId, current);
  }
  return summaries;
}

async function publishedProductsByVendor(db: Db, vendorIds: string[]) {
  const products = new Map<string, ProductRow[]>();
  if (!vendorIds.length) return products;
  const rows = await db
    .select()
    .from(vendorProducts)
    .where(
      and(
        inArray(vendorProducts.vendorId, vendorIds),
        eq(vendorProducts.published, true),
      ),
    );
  for (const row of rows)
    products.set(row.vendorId, [...(products.get(row.vendorId) ?? []), row]);
  return products;
}

const EMPTY_SUMMARY: PublicSummary = {
  rating: null,
  reviewCount: 0,
  counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

function pageResult<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
) {
  const start = (page - 1) * pageSize;
  return {
    items,
    page,
    pageSize,
    total,
    hasMore: start + items.length < total,
  };
}

function parseUuidOrNotFound(raw: string): string {
  const parsed = uuidSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(404, "not_found");
  return parsed.data;
}

async function enforcePublicLimit(
  rateLimiter: RateLimiter,
  request: FastifyRequest,
) {
  const allowed = await rateLimiter.consume(
    `public-marketplace:ip:${request.ip}`,
    PUBLIC_RATE_LIMIT,
    PUBLIC_RATE_WINDOW_SECONDS,
  );
  if (!allowed) throw new AppError(429, "rate_limited");
}

function publicResponseHeaders(reply: {
  header: (name: string, value: string) => unknown;
}) {
  reply.header("cache-control", "public, max-age=30, stale-while-revalidate=0");
  reply.header("x-content-type-options", "nosniff");
}

export function registerPublicMarketplaceRoutes(
  app: FastifyInstance,
  { db, rateLimiter }: PublicRouteOptions,
) {
  app.get("/v1/vendors", async (request, reply) => {
    await enforcePublicLimit(rateLimiter, request);
    publicResponseHeaders(reply);
    const query = querySchema.parse(request.query);
    const clauses = [publicationWhere()];
    if (query.category) clauses.push(eq(vendors.tradeCategory, query.category));
    if (query.town) clauses.push(ilike(vendors.town, queryPattern(query.town)));
    if (query.lga) clauses.push(ilike(vendors.lga, queryPattern(query.lga)));
    if (query.q) {
      const pattern = queryPattern(query.q);
      clauses.push(
        or(
          ilike(vendors.businessName, pattern),
          ilike(vendors.tradeCategory, pattern),
          ilike(vendors.town, pattern),
          ilike(vendors.lga, pattern),
          sql`exists (select 1 from jsonb_array_elements_text(case when jsonb_typeof(${vendors.profileData}->'serviceAreas') = 'array' then ${vendors.profileData}->'serviceAreas' else '[]'::jsonb end) area where area ilike ${pattern})`,
          sql`exists (select 1 from jsonb_array_elements(case when jsonb_typeof(${vendors.profileData}->'services') = 'array' then ${vendors.profileData}->'services' else '[]'::jsonb end) service where service->>'name' ilike ${pattern})`,
        ),
      );
    }
    const where = and(...clauses);
    const [count] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(vendors)
      .where(where);
    const rows = await db
      .select()
      .from(vendors)
      .where(where)
      .orderBy(vendors.businessName)
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const vendorIds = rows.map((row) => row.id);
    const [summaries, products] = await Promise.all([
      publicSummaries(db, vendorIds),
      publishedProductsByVendor(db, vendorIds),
    ]);
    const items = rows.map((row) =>
      publicVendorDto(
        row,
        summaries.get(row.id) ?? EMPTY_SUMMARY,
        products.get(row.id) ?? [],
      ),
    );
    return pageResult(
      items,
      query.page,
      query.pageSize,
      Number(count?.total ?? 0),
    );
  });

  app.get("/v1/vendors/:vendorId/reviews", async (request, reply) => {
    await enforcePublicLimit(rateLimiter, request);
    publicResponseHeaders(reply);
    const vendorId = parseUuidOrNotFound(
      (request.params as { vendorId: string }).vendorId,
    );
    const query = querySchema
      .pick({ page: true, pageSize: true })
      .parse(request.query);
    const [vendor] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(and(eq(vendors.id, vendorId), publicationWhere()))
      .limit(1);
    if (!vendor) throw new AppError(404, "not_found");
    const [count] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(reviews)
      .where(
        and(eq(reviews.vendorId, vendorId), eq(reviews.status, "published")),
      );
    const rows = await db
      .select()
      .from(reviews)
      .where(
        and(eq(reviews.vendorId, vendorId), eq(reviews.status, "published")),
      )
      .orderBy(desc(reviews.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const total = Number(count?.total ?? 0);
    const items = rows.map((review) => ({
      id: review.id,
      reviewerName: "Customer",
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      reply: review.vendorReply
        ? {
            body: review.vendorReply,
            createdAt: (
              review.vendorRepliedAt ?? review.createdAt
            ).toISOString(),
          }
        : null,
    }));
    const summary = await publicSummaries(db, [vendorId]);
    return {
      ...pageResult(items, query.page, query.pageSize, total),
      summary: summary.get(vendorId) ?? EMPTY_SUMMARY,
    };
  });

  app.get("/v1/vendors/:vendorId", async (request, reply) => {
    await enforcePublicLimit(rateLimiter, request);
    publicResponseHeaders(reply);
    const vendorId = parseUuidOrNotFound(
      (request.params as { vendorId: string }).vendorId,
    );
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.id, vendorId), publicationWhere()))
      .limit(1);
    if (!vendor) throw new AppError(404, "not_found");
    const products = await db
      .select()
      .from(vendorProducts)
      .where(
        and(
          eq(vendorProducts.vendorId, vendorId),
          eq(vendorProducts.published, true),
        ),
      )
      .orderBy(desc(vendorProducts.createdAt));
    const summaries = await publicSummaries(db, [vendorId]);
    return {
      vendor: publicVendorDto(
        vendor,
        summaries.get(vendorId) ?? EMPTY_SUMMARY,
        products,
      ),
      products: products.map(publicProductDto),
      kind: vendor.kind,
    };
  });

  app.get("/v1/products", async (request, reply) => {
    await enforcePublicLimit(rateLimiter, request);
    publicResponseHeaders(reply);
    const query = productQuerySchema.parse(request.query);
    const clauses = [eq(vendorProducts.published, true), publicationWhere()];
    if (query.category)
      clauses.push(eq(vendorProducts.category, query.category));
    if (query.minPriceKobo !== undefined)
      clauses.push(gte(vendorProducts.priceKobo, query.minPriceKobo));
    if (query.maxPriceKobo !== undefined)
      clauses.push(lte(vendorProducts.priceKobo, query.maxPriceKobo));
    if (query.inStock === "true") clauses.push(gte(vendorProducts.stock, 1));
    if (query.inStock === "false") clauses.push(eq(vendorProducts.stock, 0));
    if (query.town) clauses.push(ilike(vendors.town, queryPattern(query.town)));
    if (query.lga) clauses.push(ilike(vendors.lga, queryPattern(query.lga)));
    if (query.q) {
      const pattern = queryPattern(query.q);
      clauses.push(
        or(
          ilike(vendorProducts.name, pattern),
          ilike(vendorProducts.description, pattern),
          ilike(vendorProducts.category, pattern),
          ilike(vendors.businessName, pattern),
          ilike(vendors.town, pattern),
          ilike(vendors.lga, pattern),
        ),
      );
    }
    const where = and(...clauses);
    const [count] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(vendorProducts)
      .innerJoin(vendors, eq(vendorProducts.vendorId, vendors.id))
      .where(where);
    const rows = await db
      .select({ product: vendorProducts, vendor: vendors })
      .from(vendorProducts)
      .innerJoin(vendors, eq(vendorProducts.vendorId, vendors.id))
      .where(where)
      .orderBy(desc(vendorProducts.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const vendorIds = [...new Set(rows.map(({ vendor }) => vendor.id))];
    const [summaries, products] = await Promise.all([
      publicSummaries(db, vendorIds),
      publishedProductsByVendor(db, vendorIds),
    ]);
    const items = rows.map(({ product, vendor }) => ({
      product: publicProductDto(product),
      shop: publicVendorDto(
        vendor,
        summaries.get(vendor.id) ?? EMPTY_SUMMARY,
        products.get(vendor.id) ?? [],
      ),
    }));
    return pageResult(
      items,
      query.page,
      query.pageSize,
      Number(count?.total ?? 0),
    );
  });

  app.get("/v1/products/:productId", async (request, reply) => {
    await enforcePublicLimit(rateLimiter, request);
    publicResponseHeaders(reply);
    const productId = parseUuidOrNotFound(
      (request.params as { productId: string }).productId,
    );
    const [row] = await db
      .select({ product: vendorProducts, vendor: vendors })
      .from(vendorProducts)
      .innerJoin(vendors, eq(vendorProducts.vendorId, vendors.id))
      .where(
        and(
          eq(vendorProducts.id, productId),
          eq(vendorProducts.published, true),
          publicationWhere(),
        ),
      )
      .limit(1);
    if (!row) throw new AppError(404, "not_found");
    const [summaries, products] = await Promise.all([
      publicSummaries(db, [row.vendor.id]),
      publishedProductsByVendor(db, [row.vendor.id]),
    ]);
    return {
      product: publicProductDto(row.product),
      shop: publicVendorDto(
        row.vendor,
        summaries.get(row.vendor.id) ?? EMPTY_SUMMARY,
        products.get(row.vendor.id) ?? [],
      ),
    };
  });
}

export const PUBLIC_MARKETPLACE_RATE_LIMIT = PUBLIC_RATE_LIMIT;
export const PUBLIC_MARKETPLACE_RATE_WINDOW_SECONDS =
  PUBLIC_RATE_WINDOW_SECONDS;
