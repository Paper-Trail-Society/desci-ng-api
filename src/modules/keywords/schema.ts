import z from "zod";

export const getKeywordsQueryParams = z.object({
  query: z.string().min(1, "Query string is required"),
});
