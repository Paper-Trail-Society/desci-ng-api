ALTER TABLE "desci"."users" 
ALTER COLUMN "areas_of_interest" 
TYPE JSONB 
USING to_jsonb("areas_of_interest"::TEXT);