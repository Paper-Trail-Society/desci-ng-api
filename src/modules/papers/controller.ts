import * as fs from "fs";
import type { NextFunction, Request, Response } from "express";
import {
  fetchPapersQueryParams,
  getPaperSchema,
  updatePaper,
  uploadPaper,
} from "./schema";
import { db } from "../../config/db";
import {
  UpdatePaper,
  categoriesTable,
  fieldsTable,
  keywordsTable,
  paperKeywordsTable,
  papersTable,
  usersTable,
} from "../../db/schema";
import { eq, sql, inArray, or, and, SQL } from "drizzle-orm";
import z from "zod";
import { AuthenticatedRequest, MulterRequest } from "../../types";
import slug from "slug";
import { createKeyword } from "../../modules/keywords/service";
import { ipfsService } from "../../utils/ipfs";
import catchAsync from "../../utils/catch-async";
import { getRequestContext } from "../../config/request-context";
import { error } from "console";

export class PapersController {
  public create = catchAsync(async (req: MulterRequest, res: Response) => {
    const event = getRequestContext().get("wideEvent");
    const body = uploadPaper.parse(req.body);

    event.payload = body;

    if (!req.file) {
      const errorMsg = "No PDF file uploaded";
      event.error = {
        message: errorMsg,
      };
      return res.status(400).json({
        error: errorMsg,
      });
    }

    const file = req.file;

    const userId = req.user!.id; // Use authenticated user's ID

    const existingCategory = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, body.categoryId))
      .execute();

    if (existingCategory.length === 0) {
      const errorMsg = `Invalid category ID: ${body.categoryId}`;
      event.error = {
        message: errorMsg,
      };
      return res.status(400).json({
        error: errorMsg,
      });
    }

    // get the ID of all keywords matching the keyword IDs in body.keywords with an SQL IN query
    const keywordIdsInDB = await db
      .select({ id: keywordsTable.id })
      .from(keywordsTable)
      .where(inArray(keywordsTable.id, body.keywords ?? []))
      .execute();

    // filter out the IDs that exists in body.keywords but not in keywordIds
    const invalidKeywordIds = (body.keywords ?? []).filter(
      (id) => !keywordIdsInDB.find((keyword) => keyword.id === id),
    );

    if (invalidKeywordIds.length > 0) {
      const errorMsg = `Invalid keyword IDs: ${invalidKeywordIds.join(", ")}`;
      event.error = {
        message: errorMsg,
      };
      return res.status(400).json({
        error: errorMsg,
      });
    }

    const keywordIdsToMapToPaper: Set<number> = new Set(
      keywordIdsInDB.map(({ id }) => id),
    );

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
        keywordIdsToMapToPaper.add(keywordId);
      } else {
        keywordIdsToMapToPaper.add(existingKeyword[0].id);
      }
    }

    const fileBlob = new Blob([fs.readFileSync(file.path)]);

    const ipfsResponse = await ipfsService.uploadFile(
      new File([fileBlob], file.originalname, { type: file.mimetype }),
    );

    const createdPaper = await db.transaction(async (tx) => {
      const paperSlug = slug(body.title.substring(0, 100));
      const [newPaper] = await tx
        .insert(papersTable)
        .values({
          title: body.title,
          slug: paperSlug,
          abstract: body.abstract,
          categoryId: body.categoryId,
          notes: body.notes,
          ipfsCid: ipfsResponse.cid,
          ipfsUrl: `https://${process.env.PINATA_GATEWAY}/ipfs/${ipfsResponse.cid}`,
          userId,
          status: "pending",
        })
        .returning();

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
          // check if the error is a unique constraint exception. See 23505 https://www.postgresql.org/docs/current/errcodes-appendix.html
          if (error.code === "23505") {
            req.log.warn(
              { paperId: newPaper.id, keywordId },
              "Unique constraint violation: This is a duplicate keyword attachment",
            );
          }
        }
      }

      return newPaper;
    });

    return res.status(201).json(createdPaper);
  });

  public index = catchAsync(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { categoryId, fieldId, userId, search, status, page, size } =
        fetchPapersQueryParams.parse(req.query);

      const offset = (page - 1) * size;
      const limit = size;

      let conditions: SQL<string>[] = [];
      let baseQuery = sql`
              SELECT
                papers.id,
                papers.title,
                papers.slug,
                papers.abstract,
                papers.status,
                papers.notes,
                papers.ipfs_cid AS "ipfsCid",
                papers.ipfs_url AS "ipfsUrl",
                papers.user_id AS "userId",
                papers.created_at AS "createdAt",
                papers.updated_at AS "updatedAt",
                papers.category_id AS "categoryId",
                json_build_object('id', users.id, 'name', users.name, 'email', users.email) AS user,
                json_agg(json_build_object('id', keywords.id, 'name', keywords.name, 'aliases', keywords.aliases)) FILTER (WHERE keywords.id IS NOT NULL) AS keywords
              FROM desci.papers as papers
              INNER JOIN desci.users as users ON papers.user_id = users.id
              LEFT JOIN desci.paper_keywords as paper_keywords ON papers.id = paper_keywords.paper_id
              LEFT JOIN desci.keywords as keywords ON keywords.id = paper_keywords.keyword_id
              INNER JOIN desci.categories ON papers.category_id = desci.categories.id
              INNER JOIN desci.fields ON categories.field_id = desci.fields.id
          `;

      if (fieldId) {
        conditions.push(sql`fields.id = ${fieldId}`);
      }

      if (userId) {
        conditions.push(sql`papers.user_id = ${userId}`);
      }

      if (categoryId) {
        conditions.push(sql`papers.category_id = ${categoryId}`);
      }

      if (search) {
        conditions.push(sql`(
              papers.title ILIKE ${"%" + search.toLowerCase() + "%"} OR
              papers.abstract ILIKE ${"%" + search.toLowerCase() + "%"} OR
              desci.fields.name ILIKE ${"%" + search.toLowerCase() + "%"} OR
              desci.categories.name ILIKE ${"%" + search.toLowerCase() + "%"}
            )`);
      }

      const DEFAULT_VIEWABLE_PAPER_STATUS = "published";
      if (!req.user && !req.admin) {
        conditions.push(sql`papers.status = ${DEFAULT_VIEWABLE_PAPER_STATUS}`);
      } else if (status) {
        conditions.push(sql`papers.status = ${status}`);
      }

      // Build final query with conditions
      let finalQuery = baseQuery;
      if (conditions.length) {
        finalQuery = sql`${finalQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
      }

      finalQuery = sql`
            ${finalQuery}
            GROUP BY papers.id, users.id
            ORDER BY papers.created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
          `;

      // Count query with same conditions
      let countQuery = sql`
            SELECT COUNT(DISTINCT papers.id) as total
            FROM desci.papers as papers
            INNER JOIN desci.categories ON papers.category_id = desci.categories.id
            INNER JOIN desci.fields ON desci.categories.field_id = desci.fields.id
          `;

      if (conditions.length) {
        countQuery = sql`${countQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
      }

      const papersResults = await db.execute(finalQuery);
      const [{ total }] = await db.execute(countQuery);

      const nextPageUrl =
        (total as number) > offset + size
          ? `/papers?page=${page + 1}&size=${size}` +
            `${categoryId ? `&categoryId=${categoryId}` : ""}` +
            `${fieldId ? `&fieldId=${fieldId}` : ""}` +
            `${search ? `&search=${encodeURIComponent(search)}` : ""}`
          : null;
      const prevPageUrl =
        page > 1
          ? `/papers?page=${page - 1}&size=${size}` +
            `${categoryId ? `&categoryId=${categoryId}` : ""}` +
            `${fieldId ? `&fieldId=${fieldId}` : ""}` +
            `${search ? `&search=${search}` : ""}`
          : null;

      const response = {
        data: papersResults,
        next_page: nextPageUrl,
        prev_page: prevPageUrl,
        total,
        size,
      };

      return res.status(200).json(response);
    },
  );

  public update = catchAsync(async (req: MulterRequest, res: Response) => {
    const event = getRequestContext().get("wideEvent");
    const body = updatePaper.parse(req.body);

    event.payload = body;

    const { id: paperId } = z
      .object({ id: z.preprocess((v) => Number(v), z.number()) })
      .parse(req.params);

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
        const errorMsg = "Category does not exist";
        event.error = {
          message: errorMsg,
        };
        return res.status(400).json({
          error: errorMsg,
        });
      }

      updatePayload["categoryId"] = body.categoryId;
    }

    if (body.notes) {
      updatePayload["notes"] = body.notes;
    }

    if (body.status) {
      if (!req.admin) {
        const errorMsg = "Only admins can update the status of a paper.";
        event.error = {
          message: errorMsg,
        };
        return res.status(403).json({
          error: errorMsg,
        });
      }

      if (body.status === "rejected" && !body.rejectionReason) {
        const errorMsg =
          "[rejectionReason] is required to update the status of a paper to 'rejected'";
        event.error = {
          message: errorMsg,
        };
        return res.status(400).json({
          error: errorMsg,
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
        const errorMsg =
          "Only admins can change a paper's PDF. Contact info.descing@gmail.com to change this paper's PDF";
        event.error = {
          message: errorMsg,
        };
        return res.status(403).json({
          error:
            "Only admins can change a paper's PDF. Contact info.descing@gmail.com to change this paper's PDF",
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

    if (body.removedKeywords && body.removedKeywords.length > 0) {
      const keywordIdsToRemove = body.removedKeywords;

      await db.transaction(async (tx) => {
        for (const keywordId of keywordIdsToRemove) {
          try {
            await tx
              .delete(paperKeywordsTable)
              .where(
                and(
                  eq(paperKeywordsTable.paperId, paperId),
                  eq(paperKeywordsTable.keywordId, keywordId),
                ),
              );
          } catch (error) {
            req.log.error(
              error,
              `Failed to remove keyword ID ${keywordId} from paper:`,
            );
          }
        }
      });
    }

    if (body.addedKeywords) {
      const keywordIdsToAdd = new Set<number>(body.addedKeywords);

      await db.transaction(async (tx) => {
        for (const keywordId of keywordIdsToAdd) {
          const existingKeyword = await db
            .select({ id: keywordsTable.id })
            .from(keywordsTable)
            .where(eq(keywordsTable.id, keywordId))
            .execute();

          // Skip the keyword if it does not exist in the database
          if (existingKeyword.length === 0) {
            continue;
          }

          try {
            await tx
              .insert(paperKeywordsTable)
              .values({
                paperId,
                keywordId,
              })
              .returning();
          } catch (error: any) {
            // check if the error is a unique constraint exception. See 23505 https://www.postgresql.org/docs/current/errcodes-appendix.html
            if (error.code === "23505") {
              req.log.error(
                error,
                "Unique constraint violation: This keyword attachment already exists.",
              );
            }
          }
        }
      });
    }

    if (body.newKeywords) {
      const keywordIdsToMapToPaper: Set<number> = new Set();

      for (const keyword of body.newKeywords) {
        const existingKeyword = await db
          .select({ id: keywordsTable.id })
          .from(keywordsTable)
          .where(eq(keywordsTable.name, keyword.trim()))
          .execute();

        if (existingKeyword.length === 0) {
          const { id: keywordId } = await createKeyword(keyword);
          keywordIdsToMapToPaper.add(keywordId);
        } else {
          keywordIdsToMapToPaper.add(existingKeyword[0].id);
        }
      }

      // Attach the new keywords to the paper
      await db.transaction(async (tx) => {
        for (const keywordId of keywordIdsToMapToPaper) {
          try {
            await tx
              .insert(paperKeywordsTable)
              .values({
                paperId,
                keywordId,
              })
              .returning();
          } catch (error: any) {
            // check if the error is a unique constraint exception. See 23505 https://www.postgresql.org/docs/current/errcodes-appendix.html
            if (error.code === "23505") {
              req.log.error(
                error,
                "Unique constraint violation: This keyword attachment already exists.",
              );
            }
          }
        }
      });
    }

    // Update paper in DB
    const [updatedPaper] = await db
      .update(papersTable)
      .set(updatePayload)
      .where(eq(papersTable.id, paperId))
      .returning();

    return res.status(200).json(updatedPaper);
  });

  public getPaperByIdOrSlug = catchAsync(
    async (req: Request, res: Response) => {
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
          category: {
            id: categoriesTable.id,
            name: categoriesTable.name,
            fieldId: categoriesTable.fieldId,
          },
          field: {
            id: fieldsTable.id,
            name: fieldsTable.name,
          },
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
        .innerJoin(
          categoriesTable,
          eq(categoriesTable.id, papersTable.categoryId),
        )
        .innerJoin(fieldsTable, eq(fieldsTable.id, categoriesTable.fieldId))
        .leftJoin(
          paperKeywordsTable,
          eq(papersTable.id, paperKeywordsTable.paperId),
        )
        .leftJoin(
          keywordsTable,
          eq(keywordsTable.id, paperKeywordsTable.keywordId),
        )
        .where(
          or(
            eq(
              papersTable.id,
              !isNaN(parseInt(paperId, 10)) ? parseInt(paperId, 10) : 0,
            ),
            eq(papersTable.slug, paperId),
          ),
        )
        .groupBy(
          papersTable.id,
          usersTable.id,
          usersTable.name,
          usersTable.email,
          categoriesTable.id,
          fieldsTable.id,
        )
        .limit(1)
        .execute();

      if (!paper) {
        return res.status(404).json({
          error: "Paper not found",
        });
      }

      return res.status(200).json(paper);
    },
  );

  public delete = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id: paperId } = z
        .object({ id: z.preprocess((v) => Number(v), z.number()) })
        .parse(req.params);

      const [existingPaper] = await db
        .select()
        .from(papersTable)
        .where(eq(papersTable.id, paperId));

      if (!existingPaper) {
        return res.status(404).json({
          error: "Paper not found",
        });
      }

      // TODO: Allow admins to delete papers
      if (existingPaper.userId != req.user!.id) {
        return res.status(404).json({ error: "Paper not found" });
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(paperKeywordsTable)
          .where(eq(paperKeywordsTable.paperId, paperId));

        await tx.delete(papersTable).where(eq(papersTable.id, paperId));
      });

      const ipfsFile = await ipfsService.getFileByCid(existingPaper.ipfsCid);

      if (ipfsFile) {
        const ipfsResponse = await ipfsService.deleteFilesByCid([ipfsFile.id]);
      }

      return res.status(200).json({
        message: `'${existingPaper.title}' paper deleted successfully`,
      });
    },
  );
}
