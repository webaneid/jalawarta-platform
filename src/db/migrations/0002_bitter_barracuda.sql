CREATE TABLE "plugins" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"config_schema" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_plugins" (
	"tenant_id" text NOT NULL,
	"plugin_id" text NOT NULL,
	"config" jsonb,
	"status" text DEFAULT 'INACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tenant_plugins_tenant_id_plugin_id_pk" PRIMARY KEY("tenant_id","plugin_id")
);
--> statement-breakpoint
ALTER TABLE "tenant_plugins" ADD CONSTRAINT "tenant_plugins_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_plugins" ADD CONSTRAINT "tenant_plugins_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;