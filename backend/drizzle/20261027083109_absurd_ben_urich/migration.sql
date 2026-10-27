ALTER TABLE "lesson_attachments" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "lesson_attachments" DROP COLUMN "public_or_signed_url";--> statement-breakpoint
ALTER TABLE "lesson_attachments" ALTER COLUMN "r2_object_key" DROP NOT NULL;