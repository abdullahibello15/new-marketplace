import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Db } from "../db/client.js";
import { subscriptions } from "../db/schema/index.js";
import { AppError } from "../http/errors.js";
import { authenticateProvider, vendorForUser } from "../vendors/access.js";

/** Static plan catalogue. Payment and plan changes are not enabled yet. */
export const SUBSCRIPTION_PLANS = [
  {
    id: "free",
    name: "Free",
    priceKobo: 0,
    includes: ["Basic vendor profile"],
  },
  {
    id: "starter",
    name: "Starter",
    priceKobo: 200_000,
    includes: [
      "Public profile and search listing",
      "Up to 3 services",
      "Up to 10 products",
      "3 portfolio photos",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    priceKobo: 700_000,
    includes: [
      "Public profile and search listing",
      "Up to 10 services",
      "Up to 50 products",
      "6 portfolio photos",
      "Verified trade badge",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    priceKobo: 1_500_000,
    includes: [
      "Public profile and search listing",
      "Up to 30 services",
      "Unlimited products",
      "Full portfolio",
      "Priority search placement",
      "Full reports",
    ],
  },
] as const;

export function registerSubscriptionRoutes(app: FastifyInstance, db: Db) {
  app.get("/v1/vendors/me/subscription", async (request) => {
    const { user } = await authenticateProvider(request, db);
    const vendor = await vendorForUser(db, user.id);
    if (!vendor) throw new AppError(404, "not_found");

    const [record] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.vendorId, vendor.id))
      .limit(1);
    const current = record
      ? {
          plan: record.plan,
          status: record.status,
          renewsAt: record.renewsAt?.toISOString() ?? null,
        }
      : { plan: "free", status: "free", renewsAt: null };

    return { current, plans: SUBSCRIPTION_PLANS };
  });
}
