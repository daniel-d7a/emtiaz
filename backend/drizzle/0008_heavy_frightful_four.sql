CREATE INDEX "course_teacher_idx" ON "courses" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "group_lesson_lesson_idx" ON "group_lesson_access" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "group_student_student_idx" ON "group_students" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "group_course_idx" ON "groups" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "attachment_lesson_idx" ON "lesson_attachments" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "completion_student_idx" ON "lesson_completions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "lesson_module_idx" ON "lessons" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "manual_grade_student_idx" ON "manual_grade_values" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "module_course_idx" ON "modules" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "notification_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "parent_students_student_idx" ON "parent_students" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "attempt_student_group_idx" ON "quiz_attempts" USING btree ("student_id","group_id");--> statement-breakpoint
CREATE INDEX "attempt_quiz_idx" ON "quiz_attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "question_quiz_idx" ON "quiz_questions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");