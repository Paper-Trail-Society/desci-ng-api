import { count, desc, eq } from "drizzle-orm";
import { db } from "../../config/db";
import {
  institutionsTable,
  projectShowcaseSubmissionsTable,
  projectShowcaseWaitlistTable,
} from "../../db/schema";
import { buildOffsetPaginationLinks } from "../../utils/paginator";
import {
  CreateProjectShowcaseSubmissionInput,
  CreateProjectShowcaseWaitlistInput,
  ListProjectShowcaseSubmissionsQuery,
} from "./schema";

type CreateProjectShowcaseSubmissionPersistenceInput = Omit<
  CreateProjectShowcaseSubmissionInput,
  "institutionInput"
> & {
  institutionId: number;
};

const submissionSelection = {
  id: projectShowcaseSubmissionsTable.id,
  fullName: projectShowcaseSubmissionsTable.fullName,
  email: projectShowcaseSubmissionsTable.email,
  phoneNumber: projectShowcaseSubmissionsTable.phoneNumber,
  department: projectShowcaseSubmissionsTable.department,
  degreeProgram: projectShowcaseSubmissionsTable.degreeProgram,
  projectTitle: projectShowcaseSubmissionsTable.projectTitle,
  projectSummary: projectShowcaseSubmissionsTable.projectSummary,
  inspiration: projectShowcaseSubmissionsTable.inspiration,
  problemStatement: projectShowcaseSubmissionsTable.problemStatement,
  supportUse: projectShowcaseSubmissionsTable.supportUse,
  beneficiaries: projectShowcaseSubmissionsTable.beneficiaries,
  currentProgress: projectShowcaseSubmissionsTable.currentProgress,
  expectedImpact: projectShowcaseSubmissionsTable.expectedImpact,
  expectedStartDate: projectShowcaseSubmissionsTable.expectedStartDate,
  expectedEndDate: projectShowcaseSubmissionsTable.expectedEndDate,
  projectUrl: projectShowcaseSubmissionsTable.projectUrl,
  repositoryUrl: projectShowcaseSubmissionsTable.repositoryUrl,
  demoUrl: projectShowcaseSubmissionsTable.demoUrl,
  willProvideUpdates: projectShowcaseSubmissionsTable.willProvideUpdates,
  consentToFeature: projectShowcaseSubmissionsTable.consentToFeature,
  status: projectShowcaseSubmissionsTable.status,
  createdAt: projectShowcaseSubmissionsTable.createdAt,
  updatedAt: projectShowcaseSubmissionsTable.updatedAt,
  institution: {
    id: institutionsTable.id,
    name: institutionsTable.name,
  },
};

export class ProjectShowcaseSubmissionRepository {
  public findWaitlistEntryByEmail = async (email: string) => {
    return db
      .select({
        id: projectShowcaseWaitlistTable.id,
        email: projectShowcaseWaitlistTable.email,
        createdAt: projectShowcaseWaitlistTable.createdAt,
        updatedAt: projectShowcaseWaitlistTable.updatedAt,
      })
      .from(projectShowcaseWaitlistTable)
      .where(eq(projectShowcaseWaitlistTable.email, email))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  };

  public findInstitution = async (institutionId: number) => {
    return db
      .select({ id: institutionsTable.id, name: institutionsTable.name })
      .from(institutionsTable)
      .where(eq(institutionsTable.id, institutionId))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  };

  public create = async (
    payload: CreateProjectShowcaseSubmissionPersistenceInput,
  ) => {
    const [createdSubmission] = await db
      .insert(projectShowcaseSubmissionsTable)
      .values(payload)
      .returning({ id: projectShowcaseSubmissionsTable.id });

    const [submission] = await db
      .select(submissionSelection)
      .from(projectShowcaseSubmissionsTable)
      .innerJoin(
        institutionsTable,
        eq(projectShowcaseSubmissionsTable.institutionId, institutionsTable.id),
      )
      .where(eq(projectShowcaseSubmissionsTable.id, createdSubmission.id));

    return submission;
  };

  public createWaitlistEntry = async (
    payload: CreateProjectShowcaseWaitlistInput,
  ) => {
    const [entry] = await db
      .insert(projectShowcaseWaitlistTable)
      .values(payload)
      .returning({
        id: projectShowcaseWaitlistTable.id,
        email: projectShowcaseWaitlistTable.email,
        createdAt: projectShowcaseWaitlistTable.createdAt,
        updatedAt: projectShowcaseWaitlistTable.updatedAt,
      });

    return entry;
  };

  public list = async ({ page, size }: ListProjectShowcaseSubmissionsQuery) => {
    const offset = (page - 1) * size;

    const [data, [{ total }]] = await Promise.all([
      db
        .select(submissionSelection)
        .from(projectShowcaseSubmissionsTable)
        .innerJoin(
          institutionsTable,
          eq(projectShowcaseSubmissionsTable.institutionId, institutionsTable.id),
        )
        .orderBy(desc(projectShowcaseSubmissionsTable.createdAt))
        .limit(size)
        .offset(offset),
      db
        .select({ total: count() })
        .from(projectShowcaseSubmissionsTable),
    ]);

    return {
      data,
      total,
      size,
      ...buildOffsetPaginationLinks("/project-showcase-submissions", {
        total,
        page,
        size,
      }),
    };
  };
}
