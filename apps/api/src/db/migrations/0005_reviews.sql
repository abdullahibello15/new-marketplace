CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"customer_id" uuid,
	"job_id" uuid,
	"rating" integer NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"vendor_reply" text,
	"vendor_replied_at" timestamp with time zone,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_check" CHECK ("reviews"."rating" between 1 and 5),
	CONSTRAINT "reviews_vendor_reply_length_check" CHECK ("reviews"."vendor_reply" is null or char_length("reviews"."vendor_reply") between 2 and 500),
	CONSTRAINT "reviews_status_check" CHECK ("reviews"."status" in ('published', 'hidden', 'reported'))
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_vendor_status_created_idx" ON "reviews" USING btree ("vendor_id","status","created_at");