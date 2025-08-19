CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"field_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "papers" RENAME COLUMN "content" TO "notes";--> statement-breakpoint
ALTER TABLE "papers" ALTER COLUMN "title" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "papers" ADD COLUMN "field_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "papers" ADD COLUMN "category_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "papers" ADD COLUMN "keywords" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "papers" ADD COLUMN "ipfs_cid" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "papers" ADD COLUMN "ipfs_url" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papers" ADD CONSTRAINT "papers_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papers" ADD CONSTRAINT "papers_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "title_idx" ON "papers" USING btree ("title");--> statement-breakpoint
CREATE INDEX "abstract_idx" ON "papers" USING btree ("abstract");--> statement-breakpoint
CREATE INDEX "field_id_idx" ON "papers" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "category_id_idx" ON "papers" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "papers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "keywords_gin_idx" ON "papers" USING gin ("keywords");--> statement-breakpoint
CREATE INDEX "search_index" ON "papers" USING gin ((
        setweight(to_tsvector('english', "title"), 'A') ||
        setweight(to_tsvector('english', "abstract"), 'B')
    ));