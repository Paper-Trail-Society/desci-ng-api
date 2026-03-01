import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../../config/db";
import {
  papersTable,
  paperCommentsTable,
  usersTable,
  SelectPaper,
} from "../../db/schema";
import { PaperComment } from "./types";

export class PapersRepository {
  public findPaperById = async (paperId: number) => {
    const [paper] = await db
      .select()
      .from(papersTable)
      .where(eq(papersTable.id, paperId))
      .limit(1)
      .execute();

    return paper as SelectPaper | undefined;
  };

  public findCommentById = async (commentId: number) => {
    const [comment] = await db
      .select({
        id: paperCommentsTable.id,
        paperId: paperCommentsTable.paperId,
        authorId: paperCommentsTable.authorId,
        parentCommentId: paperCommentsTable.parentCommentId,
        bodyMarkdown: paperCommentsTable.bodyMarkdown,
        bodyHtml: paperCommentsTable.bodyHtml,
        createdAt: paperCommentsTable.createdAt,
        updatedAt: paperCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
        },
      })
      .from(paperCommentsTable)
      .innerJoin(usersTable, eq(usersTable.id, paperCommentsTable.authorId))
      .where(eq(paperCommentsTable.id, commentId))
      .limit(1)
      .execute();

    return (comment as PaperComment | undefined) ?? null;
  };

  public createComment = async (params: {
    paperId: number;
    authorId: string;
    parentCommentId: number | null;
    bodyMarkdown: string;
    bodyHtml: string;
  }) => {
    const [comment] = await db
      .insert(paperCommentsTable)
      .values({
        paperId: params.paperId,
        authorId: params.authorId,
        parentCommentId: params.parentCommentId,
        bodyMarkdown: params.bodyMarkdown,
        bodyHtml: params.bodyHtml,
      })
      .returning()
      .execute();


    return comment;
  };

  public listCommentsForPaper = async (paperId: number) => {
    const comments = await db
      .select({
        id: paperCommentsTable.id,
        paperId: paperCommentsTable.paperId,
        authorId: paperCommentsTable.authorId,
        parentCommentId: paperCommentsTable.parentCommentId,
        bodyMarkdown: paperCommentsTable.bodyMarkdown,
        bodyHtml: paperCommentsTable.bodyHtml,
        createdAt: paperCommentsTable.createdAt,
        updatedAt: paperCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
        },
      })
      .from(paperCommentsTable)
      .innerJoin(usersTable, eq(usersTable.id, paperCommentsTable.authorId))
      .where(eq(paperCommentsTable.paperId, paperId))
      .orderBy(
        // newest first by default
        desc(paperCommentsTable.createdAt),
      )
      .execute();

    return comments as PaperComment[];
  };

  public doesTopLevelCommentBelongToPaper = async (
    commentId: number,
    paperId: number,
  ) => {
    const [comment] = await db
      .select({
        id: paperCommentsTable.id,
      })
      .from(paperCommentsTable)
      .where(
        and(
          eq(paperCommentsTable.id, commentId),
          eq(paperCommentsTable.paperId, paperId),
          isNull(paperCommentsTable.parentCommentId),
        ),
      )
      .limit(1)
      .execute();

    return !!comment;
  };
}

