import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createDb } from "../src/db/client.js";
import { loadEnv } from "../src/config/env.js";
import { vendorProducts, vendors } from "../src/db/schema/index.js";

const args = process.argv.slice(2);
const vendorId = z
  .string()
  .uuid()
  .parse(args.find((arg) => !arg.startsWith("--")));
const force = args.includes("--force");
const allowProduction = args.includes("--allow-production");
const env = loadEnv();

if (env.NODE_ENV === "production" && !allowProduction) {
  throw new Error(
    "Refusing to activate a vendor in production. Pass --allow-production to proceed explicitly.",
  );
}

const { db, sql: connection } = createDb(env.DATABASE_URL);

try {
  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, vendorId))
    .limit(1);
  if (!vendor) throw new Error(`Vendor ${vendorId} does not exist.`);

  const profile = vendor.profileData ?? {};
  const services = Array.isArray(profile.services) ? profile.services : [];
  const pricedService = services.some((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const service = raw as Record<string, unknown>;
    const min = Number(service.minPrice);
    const max = Number(service.maxPrice);
    return (
      typeof service.name === "string" &&
      Boolean(service.name.trim()) &&
      Number.isFinite(min) &&
      min > 0 &&
      Number.isFinite(max) &&
      max >= min
    );
  });
  const [published] = await db
    .select({ id: vendorProducts.id })
    .from(vendorProducts)
    .where(
      and(
        eq(vendorProducts.vendorId, vendorId),
        eq(vendorProducts.published, true),
      ),
    )
    .limit(1);

  const criteria = [
    [
      "business name (2–80 characters)",
      vendor.businessName.trim().length >= 2 &&
        vendor.businessName.trim().length <= 80,
    ],
    ["trade category", vendor.tradeCategory.trim().length > 0],
    ["town", vendor.town.trim().length > 0],
    ["LGA", vendor.lga.trim().length > 0],
    [
      "at least one published product or a service with a valid price",
      Boolean(published) || pricedService,
    ],
  ] as const;
  const missing = criteria.filter(([, met]) => !met).map(([label]) => label);
  if (missing.length) {
    process.stderr.write(
      `Vendor does not meet public listing criteria:\n${missing.map((item) => `- ${item}`).join("\n")}\n`,
    );
    if (!force)
      throw new Error(
        "No status change made. Pass --force to activate anyway.",
      );
    process.stderr.write(
      "Proceeding because --force was supplied. The vendor will remain hidden until all criteria are met.\n",
    );
  }

  await db
    .update(vendors)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(vendors.id, vendorId));
  process.stdout.write(`Vendor ${vendorId} status set to active.\n`);
} finally {
  await connection.end({ timeout: 5 });
}
