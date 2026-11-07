CREATE TABLE "teacher_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"giver_teacher_id" text NOT NULL,
	"taker_teacher_id" text NOT NULL UNIQUE,
	"referral_code" text NOT NULL,
	"status" text DEFAULT 'PENDING_GROUP' NOT NULL,
	"rewarded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_referral_code_key" UNIQUE("referral_code");--> statement-breakpoint
CREATE INDEX "teacher_referrals_giver_idx" ON "teacher_referrals" ("giver_teacher_id");--> statement-breakpoint
CREATE INDEX "teacher_referrals_taker_idx" ON "teacher_referrals" ("taker_teacher_id");--> statement-breakpoint
ALTER TABLE "teacher_referrals" ADD CONSTRAINT "teacher_referrals_giver_teacher_id_user_id_fkey" FOREIGN KEY ("giver_teacher_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teacher_referrals" ADD CONSTRAINT "teacher_referrals_taker_teacher_id_user_id_fkey" FOREIGN KEY ("taker_teacher_id") REFERENCES "user"("id") ON DELETE CASCADE;