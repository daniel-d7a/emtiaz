CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" text NOT NULL UNIQUE,
	"plan_id" uuid NOT NULL,
	"duration_days" integer NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"teacher_id" text NOT NULL,
	"occasion" text NOT NULL,
	"plan_slug" text,
	"reference_id" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_gifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"teacher_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"plan_slug" text NOT NULL,
	"tier_rank" integer NOT NULL,
	"plan_name_ar" text NOT NULL,
	"plan_name_en" text NOT NULL,
	"duration_days" integer NOT NULL,
	"source" text NOT NULL,
	"source_ref" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "promo_codes_code_idx" ON "promo_codes" ("code");--> statement-breakpoint
CREATE INDEX "teacher_discounts_teacher_idx" ON "teacher_discounts" ("teacher_id");--> statement-breakpoint
CREATE INDEX "teacher_gifts_teacher_idx" ON "teacher_gifts" ("teacher_id");--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teacher_discounts" ADD CONSTRAINT "teacher_discounts_teacher_id_user_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teacher_gifts" ADD CONSTRAINT "teacher_gifts_teacher_id_user_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teacher_gifts" ADD CONSTRAINT "teacher_gifts_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE;