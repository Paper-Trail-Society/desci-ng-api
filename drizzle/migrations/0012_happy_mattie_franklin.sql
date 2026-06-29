CREATE TABLE "desci"."project_showcase_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(50) NOT NULL,
	"institution_id" integer NOT NULL,
	"department" varchar(255) NOT NULL,
	"degree_program" varchar(120) NOT NULL,
	"project_title" varchar(255) NOT NULL,
	"project_summary" text NOT NULL,
	"inspiration" text,
	"problem_statement" text NOT NULL,
	"support_use" text,
	"beneficiaries" text,
	"current_progress" text NOT NULL,
	"expected_impact" text NOT NULL,
	"expected_start_date" timestamp NOT NULL,
	"expected_end_date" timestamp NOT NULL,
	"project_url" varchar(2048),
	"repository_url" varchar(2048),
	"demo_url" varchar(2048),
	"will_provide_updates" boolean NOT NULL,
	"consent_to_feature" boolean NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "desci"."project_showcase_submissions" ADD CONSTRAINT "project_showcase_submissions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "desci"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_showcase_submissions_status_idx" ON "desci"."project_showcase_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_showcase_submissions_institution_idx" ON "desci"."project_showcase_submissions" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "project_showcase_submissions_created_at_idx" ON "desci"."project_showcase_submissions" USING btree ("created_at");
