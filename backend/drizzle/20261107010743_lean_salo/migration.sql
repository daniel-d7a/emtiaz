CREATE TABLE "teacher_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"teacher_id" text NOT NULL,
	"plan_id" uuid,
	"plan_slug" text NOT NULL,
	"tier_rank" integer DEFAULT 0 NOT NULL,
	"plan_name_ar" text NOT NULL,
	"plan_name_en" text NOT NULL,
	"price_paid" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'OMR' NOT NULL,
	"billing_cycle" text DEFAULT 'MONTHLY' NOT NULL,
	"max_students" integer,
	"max_storage_bytes" bigint,
	"max_groups" integer,
	"starts_at" timestamp DEFAULT now() NOT NULL,
	"ends_at" timestamp,
	"source" text DEFAULT 'ADMIN_PAID' NOT NULL,
	"gifts_applied_in_cycle" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "teacher_subs_teacher_ends_idx" ON "teacher_subscriptions" ("teacher_id","ends_at");--> statement-breakpoint
ALTER TABLE "teacher_subscriptions" ADD CONSTRAINT "teacher_subscriptions_teacher_id_user_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teacher_subscriptions" ADD CONSTRAINT "teacher_subscriptions_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL;