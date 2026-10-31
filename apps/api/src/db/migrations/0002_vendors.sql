CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"business_name" text NOT NULL,
	"kind" text NOT NULL,
	"trade_category" text NOT NULL,
	"town" text NOT NULL,
	"lga" text NOT NULL,
	"status" text NOT NULL DEFAULT 'pending',
	"verification_status" text NOT NULL DEFAULT 'unverified',
	"profile_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_kind_check" CHECK ("kind" in ('service', 'retail')),
	CONSTRAINT "vendors_business_name_length_check" CHECK (char_length("business_name") between 2 and 80),
	CONSTRAINT "vendors_town_not_email_check" CHECK (position('@' in "town") = 0),
	CONSTRAINT "vendors_status_check" CHECK ("status" in ('pending', 'active', 'suspended'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_owner_user_id_unique" ON "vendors" USING btree ("owner_user_id");
--> statement-breakpoint
CREATE INDEX "vendors_status_idx" ON "vendors" USING btree ("status");
