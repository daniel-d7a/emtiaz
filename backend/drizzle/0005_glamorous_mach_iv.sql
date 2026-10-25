CREATE TABLE "notification_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"whatsapp_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
