import { createHash, randomBytes } from "node:crypto";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { MemoryRateLimiter } from "../auth/service.js";
import { createDb, type Db } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import {
  reviews,
  sessions,
  userRoles,
  users,
  vendors,
} from "../db/schema/index.js";
import { createLogger } from "../observability/logger.js";

let container: StartedPostgreSqlContainer;
let db: Db;
let sql: ReturnType<typeof createDb>["sql"];
let app: ReturnType<typeof createApp>;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

async function provider() {
  const id = crypto.randomUUID();
  const accessToken = randomBytes(32).toString("base64url");
  await db
    .insert(users)
    .values({
      id,
      name: `Review Vendor ${id.slice(0, 6)}`,
      email: `${id}@example.test`,
      activeRole: "provider",
    });
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
      businessName: `Review Shop ${id.slice(0, 6)}`,
      kind: "service",
      tradeCategory: "carpenter",
      town: "Tunga",
      lga: "Agwara",
    })
    .returning();
  return { vendor, authorization: `Bearer ${accessToken}` };
}

async function addReview(
  vendorId: string,
  rating: number,
  status: "published" | "hidden" | "reported" = "published",
) {
  const [review] = await db
    .insert(reviews)
    .values({
      vendorId,
      rating,
      status,
      comment: `Test review ${rating}`,
    })
    .returning();
  return review;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgis/postgis:16-3.5").start();
  ({ db, sql } = createDb(container.getConnectionUri()));
  await runMigrations(db);
  app = createApp({
    logger: createLogger({ level: "silent" }),
    webOrigin: "https://web.example.test",
    healthChecks: {
      postgres: () => Promise.resolve(),
      redis: () => Promise.resolve(),
    },
    auth: {
      db,
      rateLimiter: new MemoryRateLimiter(),
      origin: "https://web.example.test",
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

describe("vendor reviews API", () => {
  it("returns an empty list and zero summary when the vendor has no reviews", async () => {
    const account = await provider();
    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors/me/reviews",
      headers: { authorization: account.authorization },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      reviews: [],
      summary: {
        total: 0,
        average: 0,
        counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    });
  });

  it("computes the average and per-star counts from published reviews", async () => {
    const account = await provider();
    await addReview(account.vendor.id, 5);
    await addReview(account.vendor.id, 5);
    await addReview(account.vendor.id, 4);
    await addReview(account.vendor.id, 1);
    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors/me/reviews",
      headers: { authorization: account.authorization },
    });
    expect(response.json().summary).toEqual({
      total: 4,
      average: 3.8,
      counts: { 1: 1, 2: 0, 3: 0, 4: 1, 5: 2 },
    });
  });

  it("excludes hidden reviews from the list and summary", async () => {
    const account = await provider();
    const visible = await addReview(account.vendor.id, 5);
    await addReview(account.vendor.id, 1, "hidden");
    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors/me/reviews",
      headers: { authorization: account.authorization },
    });
    expect(
      response.json().reviews.map((review: { id: string }) => review.id),
    ).toEqual([visible.id]);
    expect(response.json().summary).toEqual({
      total: 1,
      average: 5,
      counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
    });
  });

  it("replies to an owned review and trims the reply text", async () => {
    const account = await provider();
    const review = await addReview(account.vendor.id, 4);
    const response = await app.inject({
      method: "POST",
      url: `/v1/vendors/me/reviews/${review.id}/reply`,
      headers: { authorization: account.authorization },
      payload: { body: "  Thank you for the feedback.  " },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().reply.body).toBe("Thank you for the feedback.");
    const [stored] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, review.id));
    expect(stored.vendorReply).toBe("Thank you for the feedback.");
    expect(stored.vendorRepliedAt).toBeInstanceOf(Date);
  });

  it("returns 409 when replying a second time", async () => {
    const account = await provider();
    const review = await addReview(account.vendor.id, 4);
    const url = `/v1/vendors/me/reviews/${review.id}/reply`;
    const first = await app.inject({
      method: "POST",
      url,
      headers: { authorization: account.authorization },
      payload: { body: "First response." },
    });
    const second = await app.inject({
      method: "POST",
      url,
      headers: { authorization: account.authorization },
      payload: { body: "Another response." },
    });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(409);
  });

  it("returns 404 when the review belongs to another vendor", async () => {
    const owner = await provider();
    const other = await provider();
    const review = await addReview(owner.vendor.id, 4);
    const response = await app.inject({
      method: "POST",
      url: `/v1/vendors/me/reviews/${review.id}/reply`,
      headers: { authorization: other.authorization },
      payload: { body: "Not my review." },
    });
    expect(response.statusCode).toBe(404);
  });

  it("rejects unauthenticated requests", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors/me/reviews",
    });
    expect(response.statusCode).toBe(401);
  });

  it("returns 500 when review storage is unavailable", async () => {
    const account = await provider();
    await sql.unsafe("DROP TABLE reviews");
    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors/me/reviews",
      headers: { authorization: account.authorization },
    });
    expect(response.statusCode).toBe(500);
  });
});
