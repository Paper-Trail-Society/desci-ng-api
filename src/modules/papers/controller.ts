import * as fs from "fs";
import type { Request, Response } from "express";
import { fetchPapersQueryParams, uploadPaper } from "./schema";
import { ipfsService } from "utils/ipfs";
import { db } from "utils/db";
import {
  categoriesTable,
  fieldsTable,
  papersTable,
  usersTable,
} from "db/schema";
import { and, desc, eq, gt, sql, count as drizzleCount } from "drizzle-orm";
import { PgSelectQueryBuilder } from "drizzle-orm/pg-core";
import { count } from "console";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export class PapersController {
  async create(req: MulterRequest, res: Response) {
    const body = uploadPaper.parse(req.body);

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No PDF file uploaded",
      });
    }

    const file = req.file;

    console.log("File details:", {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
    });

    const fileBlob = new Blob([fs.readFileSync(req.file.path)]);

    const ipfsResponse = await ipfsService.uploadFile(
      new File([fileBlob], file.originalname, { type: file.mimetype })
    );

    // {
    //     ipfsResponse: {
    //       id: '0198c2b9-41cc-7743-aa32-63e44fb60ddc',
    //       name: 'Complete Computer Science Self-Learning Path with Resources.pdf',
    //       size: 370188,
    //       mime_type: 'application/pdf',
    //       cid: 'bafybeidezwnftflonhxsffi7so4nzqtgdmovrm2v7wzxm4kql7scumjiai',
    //       network: 'public',
    //       number_of_files: 1,
    //       streamable: false,
    //       created_at: '2025-08-19T14:26:19.273Z',
    //       updated_at: '2025-08-19T14:26:19.273Z'
    //     }
    //   }

    console.log({ ipfsResponse });
    const userId = 1; // should be the currently authenticated user

    // Create paper in DB
    const [newPaper] = await db
      .insert(papersTable)
      .values({
        title: body.title,
        abstract: body.abstract,
        categoryId: body.categoryId,
        keywords: body.keywords,
        notes: body.notes,
        ipfsCid: ipfsResponse.cid,
        ipfsUrl: `${process.env.PINATA_GATEWAY}/ipfs/${ipfsResponse.cid}`,
        userId,
      })
      .returning();

    return res.status(201).json(newPaper);
  }

  async index(req: Request, res: Response) {
    const { categoryId, fieldId, search, page, size } =
      fetchPapersQueryParams.parse(req.query);

    const offset = (page - 1) * size;

    // Maybe add field ID to the returned fields depending on UI requirements
    let baseQuery = db
      .select({
        id: papersTable.id,
        title: papersTable.title,
        abstract: papersTable.abstract,
        notes: papersTable.notes,
        ipfsCid: papersTable.ipfsCid,
        ipfsUrl: papersTable.ipfsUrl,
        userId: papersTable.userId,
        createdAt: papersTable.createdAt,
        updatedAt: papersTable.updatedAt,
        categoryId: papersTable.categoryId,
        keywords: papersTable.keywords,
      })
      .from(papersTable)
      .$dynamic();

    let countQuery = db
      .select({ count: drizzleCount(papersTable.id) })
      .from(papersTable)
      .$dynamic();

    if (fieldId) {
      baseQuery = baseQuery
        .innerJoin(
          categoriesTable,
          eq(papersTable.categoryId, categoriesTable.id)
        )
        .innerJoin(fieldsTable, eq(categoriesTable.fieldId, fieldsTable.id))
        .where(eq(fieldsTable.id, fieldId));

      countQuery = countQuery
        .innerJoin(
          categoriesTable,
          eq(papersTable.categoryId, categoriesTable.id)
        )
        .innerJoin(fieldsTable, eq(categoriesTable.fieldId, fieldsTable.id))
        .where(eq(fieldsTable.id, fieldId));
    }

    if (categoryId) {
      // conditions["categoryId"] = eq(papersTable.categoryId, categoryId);
      baseQuery = baseQuery.where(eq(papersTable.categoryId, categoryId));
      countQuery = countQuery.where(eq(papersTable.categoryId, categoryId));
    }

    if (search) {

      // TODO: Use full-text search + fuzzy matching
      baseQuery = baseQuery.where(sql`(
        ${papersTable.title} ILIKE ${`${search}%`} OR
        ${papersTable.abstract} ILIKE ${`${search}%`}
      )`);

      countQuery = countQuery.where(sql`(
        ${papersTable.title} ILIKE ${`${search}%`} OR
        ${papersTable.abstract} ILIKE ${`${search}%`}
      )`);
    }

    const [{ count: total }] = await countQuery.execute();

    const papers = await baseQuery
      .orderBy(desc(papersTable.createdAt))
      .offset(offset)
      .limit(size)
      .execute();

    const nextPageUrl =
      total > size
        ? `/papers?page=${page + 1}&size=${size}&categoryId=${
            categoryId ?? ""
          }&fieldId=${fieldId ?? ""}&search=${encodeURIComponent(search ?? "")}`
        : null;
    const prevPageUrl =
      page - 1 > 0
        ? `/papers?page=${page - 1}&size=${size}&categoryId=${
            categoryId ?? ""
          }&fieldId=${fieldId ?? ""}&search=${search ?? ""}`
        : null;

    const response = {
      data: papers,
      next_page: nextPageUrl,
      prev_page: prevPageUrl,
      total,
      size,
    };

    return res.status(200).json(response);
  }

  // Update method
  async update(req: Request, res: Response) {
    // no-op
  }

  // Delete method
  async delete(req: Request, res: Response) {
    // no-op
  }
}
