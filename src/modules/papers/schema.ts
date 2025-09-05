import z from "zod";

export const uploadPaper = z.object({
    title: z.string(),
    abstract: z.string(),
    fieldId: z.preprocess((v) => Number(v), z.number()),
    categoryId: z.preprocess((v) => Number(v), z.number()),
    keywords: z.array(z.preprocess((v) => Number(v), z.number())),
    newKeywords: z.array(z.string()).optional().default([]),
    notes: z.string()
});

export const fetchPapersQueryParams = z.object({
    fieldId: z.preprocess((v) => Number(v), z.number()).optional(),
    categoryId: z.preprocess((v) => Number(v), z.number()).optional(),
    search: z.string().optional(),
    userId: z.string().optional(),
    page: z.preprocess((v) => Number(v), z.number()).optional().default(1),
    size: z.preprocess((v) => Number(v), z.number()).optional().default(10)
});

export const updatePaper = z.object({
    title: z.string().optional(),
    abstract: z.string().optional(),
    categoryId: z.preprocess((v) => Number(v), z.number()).optional(),
    keywords: z.array(z.string()).optional(),
    notes: z.string().optional()
}); 