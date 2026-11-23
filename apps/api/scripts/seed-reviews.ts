import { and, eq, like } from "drizzle-orm";
import { z } from "zod";
import { createDb } from "../src/db/client.js";
import { loadEnv } from "../src/config/env.js";
import { reviews, vendors } from "../src/db/schema/index.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("Review seed data cannot be inserted in production.");
}

const env = loadEnv();
if (env.NODE_ENV === "production") {
  throw new Error("Review seed data cannot be inserted in production.");
}
const vendorId = z.string().uuid().parse(process.argv[2]);
const { db, sql } = createDb(env.DATABASE_URL);

try {
  const [vendor] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.id, vendorId))
    .limit(1);
  if (!vendor) throw new Error(`Vendor ${vendorId} does not exist.`);

  const [existingSeed] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.vendorId, vendorId),
        like(reviews.comment, "[DEV SEED] %"),
      ),
    )
    .limit(1);
  if (existingSeed)
    throw new Error("Development review seeds already exist for this vendor.");

  const now = Date.now();
  await db.insert(reviews).values([
    {
      vendorId,
      customerId: null,
      jobId: null,
      rating: 5,
      comment: "[DEV SEED] Great work and clear communication.",
      vendorReply: "Thank you for your kind feedback.",
      vendorRepliedAt: new Date(now - 86_400_000),
      status: "published",
      createdAt: new Date(now - 172_800_000),
    },
    {
      vendorId,
      customerId: null,
      jobId: null,
      rating: 4,
      comment: "[DEV SEED] The work was completed as agreed.",
      vendorReply: null,
      vendorRepliedAt: null,
      status: "published",
      createdAt: new Date(now - 86_400_000),
    },
    {
      vendorId,
      customerId: null,
      jobId: null,
      rating: 2,
      comment: "[DEV SEED] Hidden review for dashboard visibility testing.",
      vendorReply: null,
      vendorRepliedAt: null,
      status: "hidden",
      createdAt: new Date(now),
    },
  ]);
  process.stdout.write("Inserted 3 development reviews.\n");
} finally {
  await sql.end({ timeout: 5 });
}
