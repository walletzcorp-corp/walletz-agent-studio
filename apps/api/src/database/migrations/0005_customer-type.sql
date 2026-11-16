DO $$ BEGIN
 CREATE TYPE "public"."customer_type" AS ENUM('pf', 'pj');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "customer_type" "customer_type" DEFAULT 'pj' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "tax_id" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "contact_phone" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_tax_id_idx" ON "tenants" USING btree ("tax_id") WHERE "tenants"."deleted_at" IS NULL AND "tenants"."tax_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenants_customer_type_idx" ON "tenants" USING btree ("customer_type");