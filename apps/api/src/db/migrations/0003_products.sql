CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"image_reference" text NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_reference_length_check" CHECK (char_length("product_images"."image_reference") between 1 and 2048),
	CONSTRAINT "product_images_alt_length_check" CHECK (char_length("product_images"."alt_text") <= 200),
	CONSTRAINT "product_images_sort_order_check" CHECK ("product_images"."sort_order" between 0 and 4)
);
--> statement-breakpoint
CREATE TABLE "vendor_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_kobo" bigint NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_products_name_length_check" CHECK (char_length("vendor_products"."name") between 1 and 80),
	CONSTRAINT "vendor_products_category_check" CHECK ("vendor_products"."category" in ('plumbing_supplies', 'electrical_supplies', 'fabrics', 'ready_made_clothing', 'tools', 'building_materials', 'accessories', 'other')),
	CONSTRAINT "vendor_products_description_length_check" CHECK (char_length("vendor_products"."description") <= 500),
	CONSTRAINT "vendor_products_price_kobo_check" CHECK ("vendor_products"."price_kobo" between 1 and 10000000000),
	CONSTRAINT "vendor_products_stock_check" CHECK ("vendor_products"."stock" between 0 and 100000),
	CONSTRAINT "vendor_products_low_stock_check" CHECK ("vendor_products"."low_stock_threshold" between 0 and 100000)
);
--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_vendor_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."vendor_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_products" ADD CONSTRAINT "vendor_products_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_images_product_id_sort_idx" ON "product_images" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "vendor_products_vendor_id_idx" ON "vendor_products" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_products_public_idx" ON "vendor_products" USING btree ("vendor_id","published");