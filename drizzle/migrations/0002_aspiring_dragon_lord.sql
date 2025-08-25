-- Drop existing foreign key constraint that references users.id
ALTER TABLE "papers" DROP CONSTRAINT "papers_user_id_users_id_fk";

-- Convert all user_id columns to text type before changing users.id
ALTER TABLE "papers" ALTER COLUMN "user_id" SET DATA TYPE text;

-- Now change users.id to text
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text;

-- Create new tables
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);

CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);

CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);

-- Add new columns to fields table
ALTER TABLE "fields" ADD COLUMN "title" text NOT NULL;
ALTER TABLE "fields" ADD COLUMN "content" text NOT NULL;
ALTER TABLE "fields" ADD COLUMN "abstract" text NOT NULL;
ALTER TABLE "fields" ADD COLUMN "user_id" text;

-- Add new columns to users table
ALTER TABLE "users" ADD COLUMN "email_verified" boolean NOT NULL;
ALTER TABLE "users" ADD COLUMN "image" text;
ALTER TABLE "users" ADD COLUMN "created_at" timestamp NOT NULL;
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp NOT NULL;

-- Recreate foreign key constraint for papers (now with text types)
ALTER TABLE "papers" ADD CONSTRAINT "papers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Add foreign key constraints for new tables
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Add foreign key constraint for fields table
ALTER TABLE "fields" ADD CONSTRAINT "fields_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
