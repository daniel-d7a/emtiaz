CREATE TABLE "admin_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"permissions" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "admin_role_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_admin_role_id_admin_roles_id_fkey" FOREIGN KEY ("admin_role_id") REFERENCES "admin_roles"("id") ON DELETE SET NULL;