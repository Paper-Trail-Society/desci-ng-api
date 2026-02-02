import slug from "slug";
import { db, papersTable, paperKeywordsTable, PaperInsert, Paper } from "./db";
import { UserFactory } from "./user-factory";
import { CategoryFactory } from "./field-factory";
import { KeywordFactory } from "./keyword-factory";

type CreatePaperOptions = Partial<PaperInsert> & {
  keywordIds?: number[];
  newKeywordNames?: string[];
};

export class PaperFactory {
  private static paperCounter = 1;

  static async create(options: CreatePaperOptions = {}): Promise<Paper> {
    const n = this.paperCounter++;

    const user = options.userId != null ? null : await UserFactory.create();
    const category =
      options.categoryId != null ? null : await CategoryFactory.create();

    const title = options.title ?? `Test Paper ${n}`;
    const paperSlug = options.slug ?? slug(`${title}-${n}`);

    const ipfsCid = options.ipfsCid ?? `test-cid-${n}`;
    const ipfsUrl =
      options.ipfsUrl ??
      `https://${process.env.PINATA_GATEWAY ?? "gateway.test"}/ipfs/${ipfsCid}`;

    const [paper] = await db
      .insert(papersTable)
      .values({
        title,
        slug: paperSlug,
        notes: options.notes ?? "Test notes",
        abstract: options.abstract ?? "Test abstract",
        userId: options.userId ?? user!.id,
        categoryId: options.categoryId ?? category!.id,
        status: options.status ?? "pending",
        reviewedBy: options.reviewedBy ?? null,
        rejectionReason: options.rejectionReason ?? null,
        ipfsCid,
        ipfsUrl,
        ...options,
      })
      .returning();

    const keywordIds: number[] = [];

    if (options.keywordIds && options.keywordIds.length > 0) {
      keywordIds.push(...options.keywordIds);
    }

    if (options.newKeywordNames && options.newKeywordNames.length > 0) {
      for (const name of options.newKeywordNames) {
        const keyword = await KeywordFactory.create({ name });
        keywordIds.push(keyword.id);
      }
    }

    if (keywordIds.length > 0) {
      await db.insert(paperKeywordsTable).values(
        keywordIds.map((keywordId) => ({
          paperId: paper.id,
          keywordId,
        })),
      );
    }

    return paper;
  }
}
