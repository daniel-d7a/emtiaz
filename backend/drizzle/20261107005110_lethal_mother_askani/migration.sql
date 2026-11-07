CREATE TYPE "country" AS ENUM('OM', 'EG');--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL UNIQUE,
	"tier_rank" integer DEFAULT 0 NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"monthly_price_omr" integer DEFAULT 0 NOT NULL,
	"yearly_monthly_price_omr" integer DEFAULT 0 NOT NULL,
	"monthly_price_egp" integer DEFAULT 0 NOT NULL,
	"yearly_monthly_price_egp" integer DEFAULT 0 NOT NULL,
	"max_students" integer,
	"max_storage_bytes" bigint,
	"max_groups" integer,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_settings" ADD COLUMN "yearly_plan_discount_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD COLUMN "referral_plan_slug" text DEFAULT 'early-bird' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD COLUMN "referral_gift_days" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "country" "country" DEFAULT 'OM'::"country" NOT NULL;--> statement-breakpoint
CREATE INDEX "plans_slug_idx" ON "plans" ("slug");--> statement-breakpoint
CREATE INDEX "plans_public_order_idx" ON "plans" ("is_public","display_order");