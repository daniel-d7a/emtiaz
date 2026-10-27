CREATE TABLE "lesson_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"lesson_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"is_present" boolean DEFAULT true NOT NULL,
	"marked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"parent_id" text NOT NULL,
	"student_id" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_lesson_attendance_idx" ON "lesson_attendance" ("lesson_id","student_id");--> statement-breakpoint
CREATE INDEX "attendance_student_idx" ON "lesson_attendance" ("student_id");--> statement-breakpoint
CREATE INDEX "parent_reports_child_idx" ON "parent_reports" ("parent_id","student_id","created_at");--> statement-breakpoint
ALTER TABLE "lesson_attendance" ADD CONSTRAINT "lesson_attendance_lesson_id_lessons_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lesson_attendance" ADD CONSTRAINT "lesson_attendance_student_id_user_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "parent_reports" ADD CONSTRAINT "parent_reports_parent_id_user_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "parent_reports" ADD CONSTRAINT "parent_reports_student_id_user_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE;