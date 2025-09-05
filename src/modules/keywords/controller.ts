import type { Request, Response } from "express";
import { keywordsTable } from "../../db/schema";
import { db } from "../../utils/db";
import { desc, sql } from "drizzle-orm";

export class KeywordController {
  async index(req: Request, res: Response) {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        status: "error",
        message: "Missing [query] parameter",
      });
    }

    const keywords = await db
    .select({
      id: keywordsTable.id,
      name: keywordsTable.name,
      aliases: keywordsTable.aliases,
    })
    .from(keywordsTable)
    .where(sql`
      ${keywordsTable.name} % ${query}
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(${keywordsTable.aliases}) alias
        WHERE alias % ${query}
      )
    `)
    .orderBy(desc(sql`
      GREATEST(
        similarity(${keywordsTable.name}, ${query}),
        (
          SELECT MAX(similarity(alias, ${query}))
          FROM jsonb_array_elements_text(${keywordsTable.aliases}) alias
        )
      )
    `)).limit(10);

    return res.status(200).json(keywords);
  }
}
