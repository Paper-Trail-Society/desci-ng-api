import type { Request, Response } from "express";
import { keywordsTable } from "../../db/schema";
import { db } from "../../config/db";
import { desc, sql } from "drizzle-orm";
import { getKeywordsQueryParams } from "./schema";

export class KeywordController {
  // TODO: add support for adding the paper count for each keyword to the SQL query and method response
  async index(req: Request, res: Response) {
    const { q } = getKeywordsQueryParams.parse(req.query);

    let keywordsQuery = db
      .select({
        id: keywordsTable.id,
        name: keywordsTable.name,
        aliases: keywordsTable.aliases,
      })
      .from(keywordsTable)
      .$dynamic();

    keywordsQuery = keywordsQuery
      .where(
        sql`
      ${keywordsTable.name} % ${q}
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(${keywordsTable.aliases}) alias
        WHERE alias % ${q}
      )
    `,
      )
      .orderBy(
        desc(sql`
      GREATEST(
        similarity(${keywordsTable.name}, ${q}),
        (
          SELECT MAX(similarity(alias, ${q}))
          FROM jsonb_array_elements_text(${keywordsTable.aliases}) alias
        )
      )
    `),
      );

    const keywords = await keywordsQuery.limit(10);

    return res.status(200).json(keywords);
  }
}
