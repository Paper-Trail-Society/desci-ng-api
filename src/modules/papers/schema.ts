import z from "zod";

export const MAX_COMMENT_LENGTH = 2000;

export const uploadPaper = z.object({
  title: z.string(),
  abstract: z.string(),
  categoryId: z.preprocess((v) => Number(v), z.number()),
  keywords: z.array(z.preprocess((v) => Number(v), z.number())).optional(),
  newKeywords: z.array(z.string()).optional().default([]),
  notes: z.string(),
});

export const fetchPapersQueryParams = z.object({
  fieldId: z.preprocess((v) => Number(v), z.number()).optional(),
  categoryId: z.preprocess((v) => Number(v), z.number()).optional(),
  search: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(["pending", "published", "rejected"]).optional(),
  page: z
    .preprocess((v) => Number(v), z.number())
    .optional()
    .default(1),
  size: z
    .preprocess((v) => Number(v), z.number())
    .optional()
    .default(10),
});

export const updatePaper = z.object({
  title: z.string().optional(),
  abstract: z.string().optional(),
  categoryId: z.preprocess((v) => Number(v), z.number()).optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "published", "rejected"]).optional(),
  rejectionReason: z.string().optional(),
  addedKeywords: z.array(z.number()).optional(),
  removedKeywords: z.array(z.number()).optional(),
  newKeywords: z.array(z.string()).optional(),
});

export const getPaperSchema = z.object({
  id: z.string(),
});

export const createPaperCommentSchema = z.object({
  body: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, {
      message: "Comment body cannot be empty",
    })
    .refine((value) => value.length <= MAX_COMMENT_LENGTH, {
      message: `Comment body must be at most ${MAX_COMMENT_LENGTH} characters long`,
    }),
  parentCommentId: z
    .preprocess(
      (v) =>
        v === undefined || v === null || v === "" ? undefined : Number(v),
      z.number().int().positive(),
    )
    .optional(),
});

export const getPaperCommentsParamsSchema = z.object({
  cursor: z.preprocess((v) => Number(v), z.number()).optional(),
  limit: z
    .preprocess((v) => Number(v), z.number())
    .optional()
    .default(10),
  sortDir: z.enum(["asc", "desc"]).default("desc").optional(),
});

export const paperIdInPath = z.object({
  paperId: z.preprocess((v) => Number(v), z.number()),
});
