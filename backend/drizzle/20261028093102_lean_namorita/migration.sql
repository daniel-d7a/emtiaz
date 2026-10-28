ALTER TABLE "courses" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "parent_students" ADD COLUMN "deleted_at" timestamp;