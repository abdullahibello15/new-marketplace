import { and, desc, eq, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { reviewParamsSchema, reviewReplySchema as replyBodySchema } from "@zamani/contracts";
import type { Db } from "../db/client.js";
import { reviews, users } from "../db/schema/index.js";
import { AppError } from "../http/errors.js";
import { authenticateProvider, vendorForUser } from "../vendors/access.js";


function reviewerName(name: string | null): string {
  if (!name?.trim()) return "Customer";
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest.at(-1)?.[0]}.` : first;
}

function toReviewResource(
  row: typeof reviews.$inferSelect,
  name: string | null,
) {
  return {
    id: row.id,
    customerName: reviewerName(name),
    item: "",
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
    reply: row.vendorReply
      ? {
          body: row.vendorReply,
          createdAt: (row.vendorRepliedAt ?? row.createdAt).toISOString(),
        }
      : null,
    report: null,
  };
}

export function registerReviewRoutes(app: FastifyInstance, db: Db) {
  app.get("/v1/vendors/me/reviews", async (request) => {
    const { user } = await authenticateProvider(request, db);
    const vendor = await vendorForUser(db, user.id);
    if (!vendor) throw new AppError(404, "not_found");

    const rows = await db
      .select({ review: reviews, customerName: users.name })
      .from(reviews)
      .leftJoin(users, eq(reviews.customerId, users.id))
      .where(
        and(eq(reviews.vendorId, vendor.id), eq(reviews.status, "published")),
      )
      .orderBy(desc(reviews.createdAt));
    const counts: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let sum = 0;
    const items = rows.map(({ review, customerName }) => {
      counts[review.rating as 1 | 2 | 3 | 4 | 5] += 1;
      sum += review.rating;
      return toReviewResource(review, customerName);
    });
    return {
      reviews: items,
      summary: {
        total: items.length,
        average: items.length ? Math.round((sum / items.length) * 10) / 10 : 0,
        counts,
      },
    };
  });

  app.post("/v1/vendors/me/reviews/:reviewId/reply", async (request) => {
    const { user } = await authenticateProvider(request, db);
    const vendor = await vendorForUser(db, user.id);
    if (!vendor) throw new AppError(404, "not_found");
    const { reviewId } = reviewParamsSchema.parse(request.params);
    const { body } = replyBodySchema.parse(request.body);
    const repliedAt = new Date();
    const [updated] = await db
      .update(reviews)
      .set({ vendorReply: body, vendorRepliedAt: repliedAt })
      .where(
        and(
          eq(reviews.id, reviewId),
          eq(reviews.vendorId, vendor.id),
          eq(reviews.status, "published"),
          isNull(reviews.vendorReply),
        ),
      )
      .returning();

    if (!updated) {
      const [existing] = await db
        .select({
          vendorId: reviews.vendorId,
          status: reviews.status,
          vendorReply: reviews.vendorReply,
        })
        .from(reviews)
        .where(and(eq(reviews.id, reviewId), eq(reviews.vendorId, vendor.id)))
        .limit(1);
      if (!existing || existing.status !== "published")
        throw new AppError(404, "not_found");
      if (existing.vendorReply !== null) throw new AppError(409, "conflict");
      throw new AppError(404, "not_found");
    }

    const [customer] = updated.customerId
      ? await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, updated.customerId))
          .limit(1)
      : [];
    return toReviewResource(updated, customer?.name ?? null);
  });
}
