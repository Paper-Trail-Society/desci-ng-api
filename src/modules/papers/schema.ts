import z from "zod";

export const uploadPaper = z.object({
    title: z.string(),
    abstract: z.string(),
    field: z.string(),
    category: z.string(),
    keywords: z.array(z.string()),
    notes: z.string()
});