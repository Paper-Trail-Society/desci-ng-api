ALTER TABLE "papers" ADD COLUMN "slug" varchar(100);--> statement-breakpoint
CREATE INDEX "slug_idx" ON "papers" USING btree ("slug");