ALTER TABLE "quiz_questions" ALTER COLUMN "question_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "question_type" SET DEFAULT 'MCQ'::text;--> statement-breakpoint
DROP TYPE "public"."question_type";--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('MCQ', 'TRUE_FALSE');--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "question_type" SET DEFAULT 'MCQ'::"public"."question_type";--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "question_type" SET DATA TYPE "public"."question_type" USING "question_type"::"public"."question_type";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "specialization";