CREATE TABLE "desci"."project_showcase_waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "project_showcase_waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "project_showcase_waitlist_email_idx" ON "desci"."project_showcase_waitlist" USING btree ("email");
--> statement-breakpoint
CREATE INDEX "project_showcase_waitlist_created_at_idx" ON "desci"."project_showcase_waitlist" USING btree ("created_at");
