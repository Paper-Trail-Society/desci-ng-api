import z from "zod";

export const profileParamsSchema = z.object({
  userId: z.string().trim().min(1),
});
