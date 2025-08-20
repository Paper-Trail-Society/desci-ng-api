import z from "zod";

export const uploadPaper = z.object({
    title: z.string(),
    abstract: z.string(),
    fieldId: z.number(),
    categoryId: z.number(),
    keywords: z.array(z.string()),
    notes: z.string()
});