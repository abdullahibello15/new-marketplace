import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { RateLimiter } from "../auth/service.js";
import type { Db } from "../db/client.js";
import {
  createProductSchema,
  MAX_PRODUCT_IMPORT_ROWS,
  productImportEnvelopeSchema as importEnvelopeSchema,
  productParamsSchema,
  updateProductSchema,
} from "@zamani/contracts";
import { vendorProducts, vendors } from "../db/schema/index.js";
import { AppError } from "../http/errors.js";
import { authenticateProvider, vendorForUser } from "../vendors/access.js";

export { MAX_PRODUCT_IMPORT_ROWS };

export const PRODUCT_WRITE_LIMIT = 20;
const PRODUCT_WRITE_WINDOW_SECONDS = 900;

interface ProductRouteOptions {
  db: Db;
  rateLimiter: RateLimiter;
}

async function ownVendor(db: Db, request: FastifyRequest) {
  const { user } = await authenticateProvider(request, db);
  const vendor = await vendorForUser(db, user.id);
  if (!vendor) throw new AppError(404, "not_found");
  return { user, vendor };
}

async function limitWrite(
  rateLimiter: RateLimiter,
  request: FastifyRequest,
  userId: string,
) {
  const [ipAllowed, userAllowed] = await Promise.all([
    rateLimiter.consume(
      `vendor-products:ip:${request.ip}`,
      100,
      PRODUCT_WRITE_WINDOW_SECONDS,
    ),
    rateLimiter.consume(
      `vendor-products:user:${userId}`,
      PRODUCT_WRITE_LIMIT,
      PRODUCT_WRITE_WINDOW_SECONDS,
    ),
  ]);
  if (!ipAllowed || !userAllowed) throw new AppError(429, "rate_limited");
}

/** Query used by the public marketplace in Phase 2c: both conditions are applied in SQL. */
export async function listPublicProducts(db: Db) {
  const rows = await db
    .select({ product: vendorProducts })
    .from(vendorProducts)
    .innerJoin(vendors, eq(vendorProducts.vendorId, vendors.id))
    .where(
      and(eq(vendorProducts.published, true), eq(vendors.status, "active")),
    );
  return rows.map(({ product }) => product);
}

export function registerProductRoutes(
  app: FastifyInstance,
  { db, rateLimiter }: ProductRouteOptions,
) {
  app.get("/v1/vendors/me/products", async (request) => {
    const { vendor } = await ownVendor(db, request);
    return db
      .select()
      .from(vendorProducts)
      .where(eq(vendorProducts.vendorId, vendor.id))
      .orderBy(desc(vendorProducts.createdAt));
  });

  app.get("/v1/vendors/me/products/:productId", async (request) => {
    const { vendor } = await ownVendor(db, request);
    const { productId } = productParamsSchema.parse(request.params);
    const [product] = await db
      .select()
      .from(vendorProducts)
      .where(
        and(
          eq(vendorProducts.id, productId),
          eq(vendorProducts.vendorId, vendor.id),
        ),
      )
      .limit(1);
    if (!product) throw new AppError(404, "not_found");
    return product;
  });

  app.post("/v1/vendors/me/products", async (request, reply) => {
    const { user, vendor } = await ownVendor(db, request);
    const body = createProductSchema.parse(request.body);
    await limitWrite(rateLimiter, request, user.id);
    const [product] = await db
      .insert(vendorProducts)
      .values({ vendorId: vendor.id, ...body })
      .returning();
    return reply.code(201).send(product);
  });

  app.post("/v1/vendors/me/products/import", async (request, reply) => {
    const { user, vendor } = await ownVendor(db, request);
    if (
      !Array.isArray(request.body) ||
      request.body.length === 0 ||
      request.body.length > MAX_PRODUCT_IMPORT_ROWS
    ) {
      throw new AppError(
        400,
        "validation_failed",
        `Import must contain between 1 and ${MAX_PRODUCT_IMPORT_ROWS} rows.`,
      );
    }

    const rowErrors: { row: number; field: string; message: string }[] = [];
    const parsedProducts: z.infer<typeof createProductSchema>[] = [];
    const firstRowByName = new Map<string, number>();

    request.body.forEach((rawEnvelope, index) => {
      const envelope = importEnvelopeSchema.safeParse(rawEnvelope);
      const sourceRow = envelope.success ? envelope.data.sourceRow : index + 1;
      if (!envelope.success) {
        for (const issue of envelope.error.issues) {
          rowErrors.push({
            row: sourceRow,
            field: String(issue.path[0] ?? "row"),
            message: issue.message,
          });
        }
        return;
      }

      const candidate = envelope.data.product;
      const record =
        candidate !== null &&
        typeof candidate === "object" &&
        !Array.isArray(candidate)
          ? (candidate as Record<string, unknown>)
          : {};
      const images = record.images;
      const sanitized = { ...record };
      delete sanitized.images;
      if (Array.isArray(images) && images.length > 0) {
        rowErrors.push({
          row: sourceRow,
          field: "images",
          message:
            "Product photos cannot be imported until image storage is available.",
        });
      }

      const result = createProductSchema.safeParse(sanitized);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const field =
            issue.path[0] === undefined ? "row" : String(issue.path[0]);
          rowErrors.push({ row: sourceRow, field, message: issue.message });
        }
        return;
      }

      const nameKey = result.data.name.trim().toLocaleLowerCase("en");
      const duplicateRow = firstRowByName.get(nameKey);
      if (duplicateRow !== undefined) {
        rowErrors.push({
          row: sourceRow,
          field: "name",
          message: `Duplicates product name on row ${duplicateRow}.`,
        });
        rowErrors.push({
          row: duplicateRow,
          field: "name",
          message: `Duplicates product name on row ${sourceRow}.`,
        });
        return;
      }
      firstRowByName.set(nameKey, sourceRow);
      parsedProducts.push(result.data);
    });

    if (rowErrors.length > 0) {
      return reply.code(422).send({
        error: {
          code: "validation_failed",
          message: "Fix the listed import rows. No products were imported.",
          messageKey: "errors:validation_failed",
          details: { rowErrors },
        },
      });
    }

    await limitWrite(rateLimiter, request, user.id);
    const created = await db.transaction((tx) =>
      tx
        .insert(vendorProducts)
        .values(
          parsedProducts.map((product) => ({
            vendorId: vendor.id,
            ...product,
          })),
        )
        .returning(),
    );
    return reply.code(201).send(created);
  });

  app.patch("/v1/vendors/me/products/:productId", async (request) => {
    const { user, vendor } = await ownVendor(db, request);
    const { productId } = productParamsSchema.parse(request.params);
    const body = updateProductSchema.parse(request.body);
    await limitWrite(rateLimiter, request, user.id);
    const [product] = await db
      .update(vendorProducts)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(vendorProducts.id, productId),
          eq(vendorProducts.vendorId, vendor.id),
        ),
      )
      .returning();
    if (!product) throw new AppError(404, "not_found");
    return product;
  });

  app.delete("/v1/vendors/me/products/:productId", async (request, reply) => {
    const { user, vendor } = await ownVendor(db, request);
    const { productId } = productParamsSchema.parse(request.params);
    await limitWrite(rateLimiter, request, user.id);
    const [product] = await db
      .delete(vendorProducts)
      .where(
        and(
          eq(vendorProducts.id, productId),
          eq(vendorProducts.vendorId, vendor.id),
        ),
      )
      .returning({ id: vendorProducts.id });
    if (!product) throw new AppError(404, "not_found");
    return reply.code(204).send();
  });
}
