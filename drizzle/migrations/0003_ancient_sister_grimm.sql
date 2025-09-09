ALTER TABLE "fields" ALTER COLUMN "name" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "fields" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "fields" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "fields" DROP COLUMN "abstract";--> statement-breakpoint
ALTER TABLE "fields" DROP COLUMN "user_id";