import { Request, Response } from "express";
import ApiError from "../../utils/api-error";
import {
  createProjectShowcaseSubmissionSchema,
  createProjectShowcaseWaitlistSchema,
  listProjectShowcaseSubmissionsQuerySchema,
} from "./schema";
import { ProjectShowcaseSubmissionRepository } from "./repository";
import { findOrCreateInstitutionByName } from "../../utils/institutions";

export class ProjectShowcaseSubmissionController {
  public constructor(
    private readonly projectShowcaseSubmissionRepository: ProjectShowcaseSubmissionRepository,
  ) {}

  public create = async (req: Request, res: Response) => {
    const payload = createProjectShowcaseSubmissionSchema.parse(req.body);
    req.ctx.set("payload", payload);

    if (payload.expectedEndDate < payload.expectedStartDate) {
      throw new ApiError("Expected finish date must be on or after the start date", 400);
    }

    let institution =
      typeof payload.institutionId === "number"
        ? await this.projectShowcaseSubmissionRepository.findInstitution(
            payload.institutionId,
          )
        : null;

    if (!institution && payload.institutionInput) {
      institution = await findOrCreateInstitutionByName(
        payload.institutionInput,
      );
    }

    if (!institution) {
      throw new ApiError("Institution does not exist", 400);
    }

    req.log.info(
      {
        origin: "project-showcase-submissions.create",
        email: payload.email,
        institutionId: institution.id,
      },
      "Creating project showcase submission",
    );

    const submissionPayload = {
      ...payload,
      institutionId: institution.id,
    };

    delete submissionPayload.institutionInput;

    const submission =
      await this.projectShowcaseSubmissionRepository.create(submissionPayload);

    return res.status(201).json({
      status: "success",
      message: "Project showcase submission received",
      data: submission,
    });
  };

  public createWaitlistEntry = async (req: Request, res: Response) => {
    const payload = createProjectShowcaseWaitlistSchema.parse(req.body);
    req.ctx.set("payload", payload);

    req.log.info(
      {
        origin: "project-showcase-submissions.create-waitlist-entry",
        email: payload.email,
      },
      "Creating project showcase waitlist entry",
    );

    const existingEntry =
      await this.projectShowcaseSubmissionRepository.findWaitlistEntryByEmail(
        payload.email,
      );

    if (existingEntry) {
      return res.status(200).json({
        status: "success",
        message: "You are already on the notify list",
        data: existingEntry,
      });
    }

    const entry =
      await this.projectShowcaseSubmissionRepository.createWaitlistEntry(
        payload,
      );

    return res.status(201).json({
      status: "success",
      message: "You will be notified when submissions reopen",
      data: entry,
    });
  };

  public list = async (req: Request, res: Response) => {
    const query = listProjectShowcaseSubmissionsQuerySchema.parse(req.query);
    req.ctx.set("query", query);

    req.log.info(
      { origin: "project-showcase-submissions.list", query },
      "Listing project showcase submissions",
    );

    const submissions =
      await this.projectShowcaseSubmissionRepository.list(query);

    return res.status(200).json({ data: submissions });
  };
}
