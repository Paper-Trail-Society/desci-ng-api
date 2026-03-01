CREATE TABLE "desci"."paper_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"paper_id" integer NOT NULL,
	"author_id" text NOT NULL,
	"parent_comment_id" integer,
	"body_markdown" varchar(2000) NOT NULL,
	"body_html" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "desci"."paper_comments" ADD CONSTRAINT "paper_comments_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "desci"."papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desci"."paper_comments" ADD CONSTRAINT "paper_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "desci"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desci"."paper_comments" ADD CONSTRAINT "paper_comments_parent_comment_id_paper_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "desci"."paper_comments"("id") ON DELETE no action ON UPDATE no action;