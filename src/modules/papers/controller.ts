import * as fs from "fs";
import type { Request, Response } from "express";
import {
  fetchPapersQueryParams,
  getPaperSchema,
  updatePaper,
  updatePaperStatusSchema,
  uploadPaper,
} from "./schema";
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
import { AuthenticatedRequest, MulterRequest } from "types";

export class PapersController {
  async create(req: MulterRequest, res: Response) {
    const body = uploadPaper.parse(req.body);
    if (!req.file) {
      return res.status(400).json({
        error: "No PDF file uploaded",
      });
    }

    const file = req.file;

    console.log("File details:", {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
    });

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

    const userId = req.user!.id; // Use authenticated user's ID

    // get the ID of all keywords matching the keyword IDs in body.keywords with an SQL IN query
    const keywordIdsInDB = await db
      .select({ id: keywordsTable.id })
      .from(keywordsTable)
      .where(inArray(keywordsTable.id, body.keywords))
      .execute();

    // filter out the IDs that exists in body.keywords but not in keywordIds
    const invalidKeywordIds = body.keywords.filter(
      (id) => !keywordIdsInDB.find((keyword) => keyword.id === id),
    );

    if (invalidKeywordIds.length > 0) {
      return res.status(400).json({
        error: `Invalid keyword IDs: ${invalidKeywordIds.join(", ")}`,
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

    const fileBlob = new Blob([fs.readFileSync(file.path)]);

    const ipfsResponse = await ipfsService.uploadFile(
      new File([fileBlob], file.originalname, { type: file.mimetype }),
    );

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
          ipfsUrl: `https://${process.env.PINATA_GATEWAY}/ipfs/${ipfsResponse.cid}`,
          userId,
          status: "pending",
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
              "Unique constraint violation: This keyword attachment already exists.",
            );
            existingKeywordAttachments.push(keywordId);
          }
        }
      }

      if (existingKeywordAttachments.length > 0) {
        return res.status(400).json({
          error: `Keyword attachments already exist for the following keyword IDs: ${existingKeywordAttachments.join(
            ", ",
          )}`,
        });
      }
      return newPaper;
    });

    return res.status(201).json(createdPaper);
  }

  async index(req: AuthenticatedRequest, res: Response) {
    const { categoryId, fieldId, userId, search, status, page, size } =
      fetchPapersQueryParams.parse(req.query);

    const offset = (page - 1) * size;

    // Maybe add field ID to the returned fields depending on UI requirements
    let baseQuery = db
      .select({
        id: papersTable.id,
        title: papersTable.title,
        abstract: papersTable.abstract,
        status: papersTable.status,
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
        keywords: sql<any>`COALESCE(json_agg(json_build_object(
          'id', ${keywordsTable.id},
          'name', ${keywordsTable.name},
          'aliases', ${keywordsTable.aliases}
        )) FILTER (WHERE ${keywordsTable.id} IS NOT NULL), '[]')`,
      })
      .from(papersTable)
      .innerJoin(usersTable, eq(papersTable.userId, usersTable.id))
      .leftJoin(
        paperKeywordsTable,
        eq(papersTable.id, paperKeywordsTable.paperId),
      )
      .leftJoin(
        keywordsTable,
        eq(keywordsTable.id, paperKeywordsTable.keywordId),
      )
      .$dynamic();

    let countQuery = db
      .select({ count: drizzleCount(papersTable.id) })
      .from(papersTable)
      .$dynamic();

    const DEFAULT_VIEWABLE_PAPER_STATUS = "published";
    if (!req.admin) {
      baseQuery = baseQuery.where(
        eq(papersTable.status, DEFAULT_VIEWABLE_PAPER_STATUS),
      );
      countQuery = countQuery.where(
        eq(papersTable.status, DEFAULT_VIEWABLE_PAPER_STATUS),
      );
    } else if (status && req.admin) {
      baseQuery = baseQuery.where(eq(papersTable.status, status));
      countQuery = countQuery.where(eq(papersTable.status, status));
    }

    if (userId) {
      baseQuery = baseQuery.where(eq(papersTable.userId, userId));
      countQuery = countQuery.where(eq(papersTable.userId, userId));
    }

    if (fieldId) {
      baseQuery = baseQuery
        .innerJoin(
          categoriesTable,
          eq(papersTable.categoryId, categoriesTable.id),
        )
        .innerJoin(fieldsTable, eq(categoriesTable.fieldId, fieldsTable.id))
        .where(eq(fieldsTable.id, fieldId));

      countQuery = countQuery
        .innerJoin(
          categoriesTable,
          eq(papersTable.categoryId, categoriesTable.id),
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

    const [{ count: total }] = await countQuery.execute();

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

    if (!req.admin && existingPaper.userId !== req.user!.id) {
      return res.status(403).json({
        error: "You don't have permission to update this paper",
      });
    }

    const updatePayload: Record<keyof UpdatePaper, any> = {
      title: undefined,
      notes: undefined,
      abstract: undefined,
      userId: undefined,
      categoryId: undefined,
      ipfsCid: undefined,
      ipfsUrl: undefined,
      rejectionReason: undefined,
      reviewedBy: undefined,
      status: undefined,
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

    if (body.status) {
      if (!req.admin) {
        return res.status(403).json({
          error: "Only admins can update the status of a paper.",
        });
      }

      if (body.status === "rejected" && !body.rejectionReason) {
        return res.status(400).json({
          error:
            "[rejectionReason] is required to update the status of a paper to 'rejected'",
        });
      }
      const reviewedBy =
        body.status === "published" || body.status === "rejected"
          ? req.admin.id
          : null;

      updatePayload["status"] = body.status;
      updatePayload["reviewedBy"] = reviewedBy;
      updatePayload["rejectionReason"] =
        body.status === "rejected" ? body.rejectionReason : null;
    }

    if (req.file) {
      if (!req.admin) {
        return res.status(403).json({
          error:
            "Only admins can change a paper's PDF. Contact admin@desci.ng to change this paper's PDF",
        });
      }
      const fileBlob = new Blob([fs.readFileSync(req.file.path)]);

      const ipfsResponse = await ipfsService.uploadFile(
        new File([fileBlob], req.file.originalname, {
          type: req.file.mimetype,
        }),
      );

      updatePayload["ipfsCid"] = ipfsResponse.cid;
      updatePayload["ipfsUrl"] =
        `${process.env.PINATA_GATEWAY}/ipfs/${ipfsResponse.cid}`;

      // delete the previous file by CID
      await ipfsService.deleteFilesByCid([existingPaper.ipfsCid]);
    }

    // Update paper in DB
    const [updatedPaper] = await db
      .update(papersTable)
      .set(updatePayload)
      .where(eq(papersTable.id, paperId))
      .returning();

    console.log({ updatedPaper });

    return res.status(200).json(updatedPaper);
  }

  async getPaperById(req: Request, res: Response) {
    const { id: paperId } = getPaperSchema.parse(req.params);

    const [paper] = await db
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
        keywords: sql<any>`COALESCE(json_agg(json_build_object(
          'id', ${keywordsTable.id},
          'name', ${keywordsTable.name},
          'aliases', ${keywordsTable.aliases}
        )) FILTER (WHERE ${keywordsTable.id} IS NOT NULL), '[]')`,
      })
      .from(papersTable)
      .innerJoin(usersTable, eq(papersTable.userId, usersTable.id))
      .leftJoin(
        paperKeywordsTable,
        eq(papersTable.id, paperKeywordsTable.paperId),
      )
      .leftJoin(
        keywordsTable,
        eq(keywordsTable.id, paperKeywordsTable.keywordId),
      )
      .where(eq(papersTable.id, paperId))
      .groupBy(papersTable.id, usersTable.id, usersTable.name, usersTable.email)
      .limit(1)
      .execute();

    if (!paper) {
      return res.status(404).json({
        error: "Paper not found",
      });
    }

    return res.status(200).json(paper);
  }

  async delete(req: Request, res: Response) {
    // no-op
  }

  async updatePaperStatus(req: AuthenticatedRequest, res: Response) {
    if (!req.admin) {
      return res.status(401).json({
        status: "error",
        message: "Admin authentication required. Please sign in to continue.",
      });
    }

    const { id: paperId } = getPaperSchema.parse(req.params);

    const [existingPaper] = await db
      .select()
      .from(papersTable)
      .where(eq(papersTable.id, paperId));

    if (!existingPaper) {
      return res.status(404).json({
        error: "Paper not found",
      });
    }

    // update paper status pased on payload
    const { status, rejectionReason } = updatePaperStatusSchema.parse(req.body);
    const reviewedBy =
      status === "published" || status === "rejected" ? req.admin.id : null;

    if (status === "rejected" && !rejectionReason) {
      return res.status(400).json({
        error: "[rejectionReason] is required",
      });
    }

    const [updatedPaper] = await db
      .update(papersTable)
      .set({
        status,
        reviewedBy,
        rejectionReason: status === "rejected" ? rejectionReason : null,
      })
      .where(eq(papersTable.id, paperId))
      .returning();

    return res.status(200).json(updatedPaper);
  }
}
