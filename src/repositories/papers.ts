import { eq, like, desc, and, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { papers, users, paperTags, tags } from "../db/schema.js";

export class PaperRepository {
  async getByUuid(uuid: string) {
    const result = await db
      .select()
      .from(papers)
      .where(eq(papers.uuid, uuid))
      .limit(1);

    return result[0] || null;
  }

  async getPapers({
    page = 1,
    limit = 10,
    searchTerm = "",
    isPublic = true,
    authorId,
    tagIds = [],
  }: {
    page?: number;
    limit?: number;
    searchTerm?: string;
    isPublic?: boolean;
    authorId?: number;
    tagIds?: number[];
  }) {
    const conditions = [];

    if (isPublic) {
      conditions.push(eq(papers.isPublic, true));
    }

    if (authorId) {
      conditions.push(eq(papers.authorId, authorId));
    }

    if (searchTerm) {
      conditions.push(
        or(
          like(papers.title, `%${searchTerm}%`),
          like(papers.abstract, `%${searchTerm}%`), // This will give so many false negatives
        ),
      );
    }

    // Combine all conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Create the base query
    let query = db
      .select({
        paper: papers,
        author: {
          id: users.id,
          name: users.name,
          institution: users.institution,
        },
      })
      .from(papers)
      .leftJoin(users, eq(papers.authorId, users.id))
      .orderBy(desc(papers.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    if (whereClause) {
      query = query.where(whereClause);
    }

    const results = await query;

    // Filter by tags if provided
    if (tagIds.length > 0) {
      // For simplicity, we're filtering in memory
      // In a real app, you might want to adjust the query to include this filter
      const paperIds = await this.getPaperIdsByTags(tagIds);
      return results.filter((r) => paperIds.includes(r.paper.id));
    }

    return results;
  }

  /**
   * Get paper IDs that have all the specified tags
   */
  private async getPaperIdsByTags(tagIds: number[]) {
    const paperTagsResults = await db
      .select({ paperId: paperTags.paperId })
      .from(paperTags)
      .where(
        tagIds.length === 1
          ? eq(paperTags.tagId, tagIds[0])
          : sql`${paperTags.tagId} IN (${tagIds.join(",")})`,
      );

    // Count occurrences of each paper ID
    const paperIdCounts = paperTagsResults.reduce((acc, { paperId }) => {
      acc.set(paperId, (acc.get(paperId) || 0) + 1);
      return acc;
    }, new Map<number, number>());

    // Return only paper IDs that have all the requested tags
    return Array.from(paperIdCounts.entries())
      .filter(([_, count]) => count === tagIds.length)
      .map(([paperId]) => paperId);
  }

  /**
   * Create a new paper
   */
  async createPaper(data: {
    title: string;
    abstract: string;
    authorId: number;
    isPublic?: boolean;
    tagIds?: number[];
  }) {
    const { title, abstract, authorId, isPublic = false, tagIds = [] } = data;

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Insert the paper
      const [paper] = await tx
        .insert(papers)
        .values({
          title,
          abstract,
          authorId,
          isPublic,
        })
        .returning();

      // Add tags if provided
      if (tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) =>
            tx.insert(paperTags).values({
              paperId: paper.id,
              tagId,
            }),
          ),
        );
      }

      return paper;
    });
  }

  /**
   * Update a paper
   */
  async updatePaper(
    id: number,
    data: Partial<{
      title: string;
      abstract: string;
      isPublic: boolean;
      tagIds: number[];
    }>,
  ) {
    const { tagIds, ...paperData } = data;

    return await db.transaction(async (tx) => {
      if (Object.keys(paperData).length > 0) {
        await tx
          .update(papers)
          .set({
            ...paperData,
            updatedAt: new Date(),
          })
          .where(eq(papers.id, id));
      }

      if (tagIds) {
        await tx.delete(paperTags).where(eq(paperTags.paperId, id));
        if (tagIds.length > 0) {
          await Promise.all(
            tagIds.map((tagId) =>
              tx.insert(paperTags).values({
                paperId: id,
                tagId,
              }),
            ),
          );
        }
      }

      const [updatedPaper] = await tx
        .select()
        .from(papers)
        .where(eq(papers.id, id))
        .limit(1);

      return updatedPaper;
    });
  }

  async deletePaper(id: number) {
    return await db.transaction(async (tx) => {
      await tx.delete(paperTags).where(eq(paperTags.paperId, id));
      await tx.delete(papers).where(eq(papers.id, id));

      return true;
    });
  }

  async incrementViewCount(id: number) {
    await db
      .update(papers)
      .set({
        viewCount: sql`${papers.viewCount} + 1`,
      })
      .where(eq(papers.id, id));
  }

  async getPopularPapers(limit = 5) {
    return await db
      .select({
        paper: papers,
        author: {
          name: users.name,
        },
      })
      .from(papers)
      .leftJoin(users, eq(papers.authorId, users.id))
      .where(eq(papers.isPublic, true))
      .orderBy(desc(papers.viewCount))
      .limit(limit);
  }

  async getPaperTags(paperId: number) {
    return await db
      .select({
        id: tags.id,
        name: tags.name,
      })
      .from(tags)
      .innerJoin(paperTags, eq(tags.id, paperTags.tagId))
      .where(eq(paperTags.paperId, paperId));
  }
}

export const paperRepository = new PaperRepository();
