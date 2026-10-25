ALTER TYPE "public"."role" ADD VALUE 'PARENT';--> statement-breakpoint
CREATE TABLE "parent_students" (
	"parent_id" text NOT NULL,
	"student_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "parent_invite_code" text DEFAULT ('P' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7))) NOT NULL;--> statement-breakpoint
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_parent_id_user_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "parent_students_pair" ON "parent_students" USING btree ("parent_id","student_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_parent_invite_code_unique" UNIQUE("parent_invite_code");