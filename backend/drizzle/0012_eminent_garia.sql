ALTER TABLE "quizzes" ALTER COLUMN "lesson_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "module_id" uuid;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_module_id_unique" UNIQUE("module_id");--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_unique" UNIQUE("course_id");--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quiz_target_chk" CHECK (("quizzes"."lesson_id" IS NOT NULL)::int + ("quizzes"."module_id" IS NOT NULL)::int + ("quizzes"."course_id" IS NOT NULL)::int = 1);