ALTER TABLE "user" ADD COLUMN "landing_slug" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "landing_bio" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "landing_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_landing_slug_unique" UNIQUE("landing_slug");