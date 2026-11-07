ALTER TABLE "teacher_discounts" ALTER COLUMN "plan_slug" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "teacher_discounts_teacher_occasion_idx" ON "teacher_discounts" ("teacher_id","occasion");