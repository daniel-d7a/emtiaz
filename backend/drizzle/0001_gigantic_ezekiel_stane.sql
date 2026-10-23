CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"recipient" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'SENT_MOCK' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
