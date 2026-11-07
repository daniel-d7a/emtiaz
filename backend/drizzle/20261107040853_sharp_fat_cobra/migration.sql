ALTER TABLE "user" ADD COLUMN "monitoring_code" varchar(8);--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_monitoring_code_key" UNIQUE("monitoring_code");