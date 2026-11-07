CREATE TABLE "teacher_grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"teacher_id" text NOT NULL,
	"grade_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "name_ar" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "name_en" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN "country" "country" DEFAULT 'OM'::"country" NOT NULL;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN "name_ar" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN "name_en" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "course_focus" "course_type" DEFAULT 'ACADEMIC'::"course_type";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboarding_completed_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_teacher_grade_idx" ON "teacher_grades" ("teacher_id","grade_id");--> statement-breakpoint
CREATE INDEX "teacher_grades_teacher_idx" ON "teacher_grades" ("teacher_id");--> statement-breakpoint
ALTER TABLE "teacher_grades" ADD CONSTRAINT "teacher_grades_teacher_id_user_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teacher_grades" ADD CONSTRAINT "teacher_grades_grade_id_grades_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE;