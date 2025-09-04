CREATE TABLE "keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"keywords" jsonb
);
--> statement-breakpoint
CREATE TABLE "paper_keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"paper_id" integer NOT NULL,
	"keyword_id" integer NOT NULL
);
--> statement-breakpoint
DROP INDEX "keywords_gin_idx";--> statement-breakpoint
ALTER TABLE "paper_keywords" ADD CONSTRAINT "paper_keywords_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_keywords" ADD CONSTRAINT "paper_keywords_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papers" DROP COLUMN "keywords";