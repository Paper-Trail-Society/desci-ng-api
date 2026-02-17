import { db, keywordsTable, KeywordInsert, Keyword } from "./db";

export class KeywordFactory {
  private static keywordCounter = 1;

  static async create(
    overrides: Partial<KeywordInsert> = {},
  ): Promise<Keyword> {
    const n = this.keywordCounter++;

    const [keyword] = await db
      .insert(keywordsTable)
      .values({
        name: overrides.name ?? `Keyword ${n}`,
        aliases: overrides.aliases ?? null,
        ...overrides,
      })
      .returning();

    return keyword;
  }
}

