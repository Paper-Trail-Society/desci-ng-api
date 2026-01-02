import { keywordsTable } from "../../db/schema";
import { db } from "../../config/db";

export const createKeyword = async (keywordName: string) => {
  const [keyword] = await db
    .insert(keywordsTable)
    .values({
      name: keywordName.trim(),
    })
    .returning();

  return keyword;
};
