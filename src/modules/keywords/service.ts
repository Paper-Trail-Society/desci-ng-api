import { keywordsTable } from "db/schema";
import { eq } from "drizzle-orm";
import { db } from "utils/db";

export const createKeyword = async (keywordName: string) => {
  const [keyword] = await db
    .insert(keywordsTable)
    .values({
      name: keywordName.trim(),
    })
    .returning();

  return keyword;
};
