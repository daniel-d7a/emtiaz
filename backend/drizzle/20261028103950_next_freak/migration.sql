CREATE TABLE "semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_settings" ADD COLUMN "primary_color" text DEFAULT '#0F766E' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD COLUMN "secondary_color" text DEFAULT '#EA580C' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD COLUMN "logo_url" text;