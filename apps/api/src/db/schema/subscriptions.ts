import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { vendors } from "./vendors.js";

export const subscriptions = pgTable(
  "subscriptions",
  {
    vendorId: uuid("vendor_id")
      .primaryKey()
      .references(() => vendors.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(),
    status: text("status").notNull(),
    renewsAt: timestamp("renews_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "subscriptions_plan_check",
      sql`${t.plan} in ('starter', 'standard', 'premium')`,
    ),
    check(
      "subscriptions_status_check",
      sql`${t.status} in ('active', 'past_due', 'cancelled')`,
    ),
  ],
);
