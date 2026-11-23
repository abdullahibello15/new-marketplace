import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { vendors } from "./vendors.js";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    jobId: uuid("job_id"),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    vendorReply: text("vendor_reply"),
    vendorRepliedAt: timestamp("vendor_replied_at", { withTimezone: true }),
    status: text("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reviews_vendor_status_created_idx").on(
      t.vendorId,
      t.status,
      t.createdAt,
    ),
    check("reviews_rating_check", sql`${t.rating} between 1 and 5`),
    check(
      "reviews_vendor_reply_length_check",
      sql`${t.vendorReply} is null or char_length(${t.vendorReply}) between 2 and 500`,
    ),
    check(
      "reviews_status_check",
      sql`${t.status} in ('published', 'hidden', 'reported')`,
    ),
  ],
);
