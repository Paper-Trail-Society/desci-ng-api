import z from "zod";

export const getKeywordsQueryParams = z.object({
  q: z.string().min(1, "Query string is required"),
});
