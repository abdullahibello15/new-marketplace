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
  sessions,
  subscriptions,
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
  await db.insert(users).values({
    id,
    name: "Subscription Test",
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
      businessName: "Subscription Test Business",
      kind: "service",
      tradeCategory: "carpenter",
      town: "Tunga",
      lga: "Agwara",
    })
    .returning();
  return { vendor, authorization: `Bearer ${accessToken}` };
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

describe("GET /v1/vendors/me/subscription", () => {
  it("returns a computed Free plan without inserting a subscription row", async () => {
    const account = await provider();
    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors/me/subscription",
      headers: { authorization: account.authorization },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().current).toEqual({
      plan: "free",
      status: "free",
      renewsAt: null,
    });
    expect(
      response.json().plans.map((plan: { id: string }) => plan.id),
    ).toContain("free");
    expect(
      await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.vendorId, account.vendor.id)),
    ).toHaveLength(0);
  });

  it("returns the signed-in vendor active subscription and ignores client vendor IDs", async () => {
    const account = await provider();
    const other = await provider();
    const renewsAt = new Date("2027-01-01T00:00:00.000Z");
    await db.insert(subscriptions).values({
      vendorId: account.vendor.id,
      plan: "standard",
      status: "active",
      renewsAt,
    });
    const response = await app.inject({
      method: "GET",
      url: `/v1/vendors/me/subscription?vendorId=${other.vendor.id}`,
      headers: { authorization: account.authorization },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().current).toEqual({
      plan: "standard",
      status: "active",
      renewsAt: renewsAt.toISOString(),
    });
  });

  it("rejects unauthenticated requests", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors/me/subscription",
    });
    expect(response.statusCode).toBe(401);
  });

  it("returns a server error when subscription storage is unavailable", async () => {
    const account = await provider();
    await sql.unsafe("DROP TABLE subscriptions");
    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors/me/subscription",
      headers: { authorization: account.authorization },
    });
    expect(response.statusCode).toBe(500);
  });
});
