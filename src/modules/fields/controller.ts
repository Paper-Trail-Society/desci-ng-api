import type { Request, Response } from "express";
import { db } from "../../utils/db";
import { categoriesTable, fieldsTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import z from "zod";


export class FieldController {

  async index(req: Request, res: Response) {
    // get all fields in DB
    const fields = await db
      .select({
        id: fieldsTable.id,
        name: fieldsTable.name,
      }).from(fieldsTable);

    return res.status(200).json(fields);
  }

  async getFieldCategories(req: Request, res: Response) {
    const { id: fieldId } = z
      .object({ id: z.preprocess((v) => Number(v), z.number()) })
      .parse(req.params);

    const categories = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
      }).from(categoriesTable)
      .where(eq(categoriesTable.fieldId, fieldId));

    return res.status(200).json(categories);
  }

}
