ALTER TYPE "question_type" ADD VALUE 'WRITTEN';--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD COLUMN "pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD COLUMN "written_grades" jsonb;