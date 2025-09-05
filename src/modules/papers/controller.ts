import * as fs from "fs";
import type { Request, Response } from "express";
import { fetchPapersQueryParams, updatePaper, uploadPaper } from "./schema";
import { ipfsService } from "../../utils/ipfs";
import { db } from "../../utils/db";
import {
  UpdatePaper,
  categoriesTable,
  fieldsTable,
  keywordsTable,
  paperKeywordsTable,
  papersTable,
  usersTable,
} from "../../db/schema";
import { desc, eq, sql, count as drizzleCount, inArray } from "drizzle-orm";
import z from "zod";
import type { AuthenticatedRequest } from "../../middlewares/auth";

interface MulterRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

export class PapersController {
  async create(req: MulterRequest, res: Response) {
    const body = uploadPaper.parse(req.body);
    console.log(req.file);
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
    const userId = "CNsGvcOMM0NKqSlJ2UCLtsnNKva6EBFm"; // Use authenticated user's ID

    // get the ID of all keywords matching the keyword IDs in body.keywords with an SQL IN query
    const keywordIdsInDB = await db
      .select({ id: keywordsTable.id })
      .from(keywordsTable)
      .where(inArray(keywordsTable.id, body.keywords))
      .execute();

    // filter out the IDs that exists in body.keywords but not in keywordIds
    const invalidKeywordIds = body.keywords.filter(
      (id) => !keywordIdsInDB.find((keyword) => keyword.id === id)
    );

    if (invalidKeywordIds.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Invalid keyword IDs: ${invalidKeywordIds.join(", ")}`,
      });
    }

    const keywordIdsToMapToPaper: number[] = [
      ...keywordIdsInDB.map(({ id }) => id),
    ];

    for (const keyword of body.newKeywords) {
      const existingKeyword = await db
        .select({ id: keywordsTable.id })
        .from(keywordsTable)
        .where(eq(keywordsTable.name, keyword.trim()))
        .execute();

      if (existingKeyword.length === 0) {
        const [{ id: keywordId }] = await db
          .insert(keywordsTable)
          .values({
            name: keyword.trim(),
          })
          .returning({ id: keywordsTable.id });
        keywordIdsToMapToPaper.push(keywordId);
      } else {
        keywordIdsToMapToPaper.push(existingKeyword[0].id);
      }
    }

    const createdPaper = await db.transaction(async (tx) => {
      // Create paper in DB
      const [newPaper] = await tx
        .insert(papersTable)
        .values({
          title: body.title,
          abstract: body.abstract,
          categoryId: body.categoryId,
          notes: body.notes,
          ipfsCid: ipfsResponse.cid,
          ipfsUrl: `${process.env.PINATA_GATEWAY}/ipfs/${ipfsResponse.cid}`,
          userId,
        })
        .returning();

      const existingKeywordAttachments = [];

      // map keywords to the paper
      for (const keywordId of keywordIdsToMapToPaper) {
        try {
          await tx
            .insert(paperKeywordsTable)
            .values({
              paperId: newPaper.id,
              keywordId,
            })
            .returning();
        } catch (error: any) {
          // check if the error is a unique constraint error in Drizzle oRM
          if (error.code === "23505") {
            // PostgreSQL unique violation error code
            console.error(
              "Unique constraint violation: This keyword attachment already exists."
            );
            existingKeywordAttachments.push(keywordId);
          }
        }
      }

      if (existingKeywordAttachments.length > 0) {
        return res.status(400).json({
          status: "error",
          message: `Keyword attachments already exist for the following keyword IDs: ${existingKeywordAttachments.join(
            ", "
          )}`,
        });
      }
      return newPaper;
    });

    return res.status(201).json(createdPaper);
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
        user: {
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
        },
        keywords: sql<any>`json_agg(json_build_object(
          'id', ${keywordsTable.id},
          'name', ${keywordsTable.name},
          'aliases', ${keywordsTable.aliases}
        ))`,
      })
      .from(papersTable)
      .innerJoin(usersTable, eq(papersTable.userId, usersTable.id))
      .innerJoin(
        paperKeywordsTable,
        eq(papersTable.id, paperKeywordsTable.paperId)
      )
      .innerJoin(
        keywordsTable,
        eq(keywordsTable.id, paperKeywordsTable.keywordId)
      )
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
      baseQuery = baseQuery.where(eq(papersTable.categoryId, categoryId));
      countQuery = countQuery.where(eq(papersTable.categoryId, categoryId));
    }

    if (search) {
      // TODO: Use full-text search + fuzzy matching
      baseQuery = baseQuery.where(sql`(
        ${papersTable.title} ILIKE ${`%${search}%`} OR
        ${papersTable.abstract} ILIKE ${`%${search}%`}
      )`);

      countQuery = countQuery.where(sql`(
        ${papersTable.title} ILIKE ${`%${search}%`} OR
        ${papersTable.abstract} ILIKE ${`%${search}%`}
      )`);
    }

    const [{ count: total }] = await countQuery
      // .groupBy(papersTable.id, usersTable.id, usersTable.name, usersTable.email)
      .execute();

    const papers = await baseQuery
      .orderBy(desc(papersTable.createdAt))
      .groupBy(papersTable.id, usersTable.id, usersTable.name, usersTable.email)
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

  async update(req: MulterRequest, res: Response) {
    const body = updatePaper.parse(req.body);
    const { id: paperId } = z
      .object({ id: z.preprocess((v) => Number(v), z.number()) })
      .parse(req.params);
    const updatePayload: Record<keyof UpdatePaper, any> = {
      title: undefined,
      notes: undefined,
      abstract: undefined,
      userId: undefined,
      categoryId: undefined,
      ipfsCid: undefined,
      ipfsUrl: undefined,
    };

    if (body.title) {
      updatePayload["title"] = body.title;
    }

    if (body.abstract) {
      updatePayload["abstract"] = body.abstract;
    }

    if (body.categoryId) {
      const [categoryExists] = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.id, body.categoryId))
        .limit(1)
        .execute();

      if (!categoryExists) {
        return res.status(400).json({
          errors: {
            categoryId: "Category does not exist",
          },
        });
      }

      updatePayload["categoryId"] = body.categoryId;
    }

    if (body.notes) {
      updatePayload["notes"] = body.notes;
    }

    if (req.file) {
      const fileBlob = new Blob([fs.readFileSync(req.file.path)]);

      const ipfsResponse = await ipfsService.uploadFile(
        new File([fileBlob], req.file.originalname, {
          type: req.file.mimetype,
        })
      );

      updatePayload["ipfsCid"] = ipfsResponse.cid;
      updatePayload[
        "ipfsUrl"
      ] = `${process.env.PINATA_GATEWAY}/ipfs/${ipfsResponse.cid}`;
    }

    // Verify the paper belongs to the authenticated user before updating
    const [existingPaper] = await db
      .select()
      .from(papersTable)
      .where(eq(papersTable.id, paperId));

    if (!existingPaper) {
      return res.status(404).json({
        error: "Paper not found",
      });
    }

    if (existingPaper.userId !== req.user!.id) {
      return res.status(403).json({
        error: "You don't have permission to update this paper",
      });
    }

    // Update paper in DB
    const [updatedPaper] = await db
      .update(papersTable)
      .set(updatePayload)
      .where(eq(papersTable.id, paperId))
      .returning();

    return res.status(200).json(updatedPaper);
  }

  async delete(req: Request, res: Response) {
    // no-op
  }
}
