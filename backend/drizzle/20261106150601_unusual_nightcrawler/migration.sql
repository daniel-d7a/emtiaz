CREATE TABLE "group_entry_code_uses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"entry_code_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_entry_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"group_id" uuid NOT NULL,
	"code" text NOT NULL UNIQUE,
	"max_uses" integer NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "entry_code_max_uses_check" CHECK ("max_uses" >= 1),
	CONSTRAINT "entry_code_used_count_check" CHECK ("used_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "requires_entry_code" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_entry_code_student_idx" ON "group_entry_code_uses" ("entry_code_id","student_id");--> statement-breakpoint
CREATE INDEX "entry_code_use_student_idx" ON "group_entry_code_uses" ("student_id");--> statement-breakpoint
CREATE INDEX "entry_code_group_idx" ON "group_entry_codes" ("group_id");--> statement-breakpoint
ALTER TABLE "group_entry_code_uses" ADD CONSTRAINT "group_entry_code_uses_entry_code_id_group_entry_codes_id_fkey" FOREIGN KEY ("entry_code_id") REFERENCES "group_entry_codes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "group_entry_code_uses" ADD CONSTRAINT "group_entry_code_uses_student_id_user_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "group_entry_codes" ADD CONSTRAINT "group_entry_codes_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;