ALTER TABLE "quiz_questions" ADD COLUMN "image_key" text;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "prompt" SET DEFAULT '';