ALTER TABLE "user" ADD COLUMN "subject_category_id" uuid;--> statement-breakpoint
UPDATE "user" u SET subject_category_id = c.id
  FROM categories c
  WHERE u.role='TEACHER' AND u.specialization IS NOT NULL
    AND lower(trim(u.specialization)) = lower(c.name);--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_subject_category_id_categories_id_fk" FOREIGN KEY ("subject_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
