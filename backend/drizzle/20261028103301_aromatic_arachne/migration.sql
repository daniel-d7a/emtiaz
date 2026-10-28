ALTER TABLE "audit_logs" ADD COLUMN "endpoint" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "response_type" text;--> statement-breakpoint
CREATE INDEX "audit_target_idx" ON "audit_logs" ("target_type");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" ("actor_id","created_at");