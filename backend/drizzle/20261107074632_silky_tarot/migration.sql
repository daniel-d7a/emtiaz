CREATE TABLE "group_homework_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"group_id" uuid NOT NULL,
	"homework_id" uuid NOT NULL,
	"due_date" timestamp,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"lesson_id" uuid NOT NULL,
	"group_id" uuid,
	"title" text NOT NULL,
	"instructions" text,
	"attachment_type" "attachment_type" DEFAULT 'NONE'::"attachment_type" NOT NULL,
	"r2_object_key" text,
	"url" text,
	"file_size_bytes" integer,
	"mime_type" text,
	"max_score" integer DEFAULT 10 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"homework_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"content" text,
	"attachment_type" "attachment_type" DEFAULT 'NONE'::"attachment_type" NOT NULL,
	"r2_object_key" text,
	"url" text,
	"file_size_bytes" integer,
	"mime_type" text,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL,
	"revision_count" integer DEFAULT 0 NOT NULL,
	"score" integer,
	"teacher_feedback" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"graded_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_group_homework_access_idx" ON "group_homework_access" ("group_id","homework_id");--> statement-breakpoint
CREATE INDEX "group_homework_group_idx" ON "group_homework_access" ("group_id");--> statement-breakpoint
CREATE INDEX "homework_lesson_idx" ON "homework" ("lesson_id");--> statement-breakpoint
CREATE INDEX "homework_group_idx" ON "homework" ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_homework_submission_idx" ON "homework_submissions" ("homework_id","group_id","student_id");--> statement-breakpoint
CREATE INDEX "homework_sub_group_idx" ON "homework_submissions" ("group_id");--> statement-breakpoint
CREATE INDEX "homework_sub_student_idx" ON "homework_submissions" ("student_id");--> statement-breakpoint
ALTER TABLE "group_homework_access" ADD CONSTRAINT "group_homework_access_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "group_homework_access" ADD CONSTRAINT "group_homework_access_homework_id_homework_id_fkey" FOREIGN KEY ("homework_id") REFERENCES "homework"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_lesson_id_lessons_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_homework_id_homework_id_fkey" FOREIGN KEY ("homework_id") REFERENCES "homework"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_student_id_user_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE;