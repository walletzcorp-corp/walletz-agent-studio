CREATE TABLE "meta_configurations" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL UNIQUE REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" text NOT NULL DEFAULT '',
  "config_id" text NOT NULL DEFAULT '',
  "encrypted_app_secret" text,
  "encrypted_verify_token" text,
  "graph_api_version" text NOT NULL DEFAULT 'v22.0',
  "webhook_status" text NOT NULL DEFAULT 'unknown',
  "connection_status" text NOT NULL DEFAULT 'unconfigured',
  "last_test_at" timestamp with time zone,
  "last_test_result" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "meta_configurations_tenant_idx" ON "meta_configurations" ("tenant_id");
