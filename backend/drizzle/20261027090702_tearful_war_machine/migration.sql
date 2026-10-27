CREATE TABLE "group_quiz_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"group_id" uuid NOT NULL,
	"quiz_id" uuid NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_lesson_access" ADD COLUMN "is_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "time" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "whatsapp_message" text;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_group_quiz_idx" ON "group_quiz_access" ("group_id","quiz_id");--> statement-breakpoint
CREATE INDEX "group_quiz_quiz_idx" ON "group_quiz_access" ("quiz_id");--> statement-breakpoint
ALTER TABLE "group_quiz_access" ADD CONSTRAINT "group_quiz_access_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "group_quiz_access" ADD CONSTRAINT "group_quiz_access_quiz_id_quizzes_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE;