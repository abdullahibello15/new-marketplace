CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text,
  "email_verified_at" timestamptz,
  "phone" text,
  "phone_verified_at" timestamptz,
  "password_hash" text,
  "language" text NOT NULL DEFAULT 'en',
  "active_role" text NOT NULL,
  "admin_role" text,
  "admin_suspended_at" timestamptz,
  "admin_added_by" jsonb,
  "last_login_at" timestamptz,
  "vendor_id" text,
  "provider_signup" jsonb,
  "rider" jsonb,
  "address" text,
  "area" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" ("phone");
--> statement-breakpoint
CREATE TABLE "user_roles" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  CONSTRAINT "user_roles_user_role_unique" UNIQUE ("user_id", "role")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "refresh_token_hash" text NOT NULL,
  "previous_refresh_token_hashes" jsonb NOT NULL DEFAULT '[]',
  "access_token_hash" text NOT NULL,
  "access_expires_at" timestamptz NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "remember" boolean NOT NULL DEFAULT false,
  "user_agent" text NOT NULL DEFAULT '',
  "device_id" text NOT NULL DEFAULT '',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "last_active_at" timestamptz NOT NULL DEFAULT now(),
  "revoked_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_refresh_token_hash_unique" ON "sessions" ("refresh_token_hash");
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "destination" text NOT NULL,
  "purpose" text NOT NULL,
  "code_hash" text NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "expires_at" timestamptz NOT NULL,
  "resend_available_at" timestamptz NOT NULL,
  "verified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "otp_challenges_destination_purpose_idx" ON "otp_challenges" ("destination", "purpose", "created_at");
--> statement-breakpoint
CREATE TABLE "password_resets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "password_resets_token_hash_unique" ON "password_resets" ("token_hash");
--> statement-breakpoint
CREATE INDEX "password_resets_user_id_idx" ON "password_resets" ("user_id");
