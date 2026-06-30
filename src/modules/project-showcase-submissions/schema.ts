import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url("Please provide a valid URL")
  .max(2048)
  .optional()
  .or(z.literal(""))
  .transform((value) => value || undefined);

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined);

const optionalInstitutionInput = z
  .string()
  .trim()
  .max(255)
  .optional()
  .or(z.literal(""))
  .transform((value) => value || undefined);

export const createProjectShowcaseSubmissionSchema = z
  .object({
    fullName: z.string().trim().min(2).max(255),
    email: z.string().trim().email().max(255),
    phoneNumber: z.string().trim().min(7).max(50),
    institutionId: z.coerce.number().int().positive().optional(),
    institutionInput: optionalInstitutionInput,
    department: z.string().trim().min(2).max(255),
    degreeProgram: z.string().trim().min(2).max(120),
    projectTitle: z.string().trim().min(3).max(255),
    projectSummary: z.string().trim().min(80).max(5000),
    inspiration: optionalText(3000),
    problemStatement: z.string().trim().min(50).max(5000),
    supportUse: optionalText(3000),
    beneficiaries: optionalText(3000),
    currentProgress: z.string().trim().min(30).max(5000),
    expectedImpact: z.string().trim().min(50).max(5000),
    expectedStartDate: z.coerce.date(),
    expectedEndDate: z.coerce.date(),
    projectUrl: optionalUrl,
    repositoryUrl: optionalUrl,
    demoUrl: optionalUrl,
    willProvideUpdates: z.coerce.boolean(),
    consentToFeature: z.coerce.boolean(),
  })
  .superRefine((value, ctx) => {
    const hasInstitutionId = typeof value.institutionId === "number";
    const hasInstitutionInput =
      typeof value.institutionInput === "string" &&
      value.institutionInput.trim().length >= 2;

    if (!hasInstitutionId && !hasInstitutionInput) {
      ctx.addIssue({
        code: "custom",
        path: ["institutionInput"],
        message: "University or institution is required",
      });
    }
  });

export const createProjectShowcaseWaitlistSchema = z.object({
  email: z.string().trim().email().max(255),
});

export const listProjectShowcaseSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProjectShowcaseSubmissionInput = z.infer<
  typeof createProjectShowcaseSubmissionSchema
>;

export type CreateProjectShowcaseWaitlistInput = z.infer<
  typeof createProjectShowcaseWaitlistSchema
>;

export type ListProjectShowcaseSubmissionsQuery = z.infer<
  typeof listProjectShowcaseSubmissionsQuerySchema
>;
