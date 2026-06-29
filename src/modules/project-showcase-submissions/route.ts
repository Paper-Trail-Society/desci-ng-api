import { Router } from "express";
import { adminAuthMiddleware } from "../../middlewares/auth/admin-auth";
import { authMiddleware } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validate-request";
import catchAsync from "../../utils/catch-async";
import { ProjectShowcaseSubmissionController } from "./controller";
import { ProjectShowcaseSubmissionRepository } from "./repository";
import {
  createProjectShowcaseSubmissionSchema,
  createProjectShowcaseWaitlistSchema,
  listProjectShowcaseSubmissionsQuerySchema,
} from "./schema";

export const projectShowcaseSubmissionRouter = Router();
const projectShowcaseSubmissionController = new ProjectShowcaseSubmissionController(
  new ProjectShowcaseSubmissionRepository(),
);

projectShowcaseSubmissionRouter.post(
  "/project-showcase-submissions",
  authMiddleware({}),
  validateRequest("body", createProjectShowcaseSubmissionSchema),
  catchAsync(projectShowcaseSubmissionController.create),
);

projectShowcaseSubmissionRouter.post(
  "/project-showcase-waitlist",
  validateRequest("body", createProjectShowcaseWaitlistSchema),
  catchAsync(projectShowcaseSubmissionController.createWaitlistEntry),
);

projectShowcaseSubmissionRouter.get(
  "/project-showcase-submissions",
  adminAuthMiddleware({}),
  validateRequest("query", listProjectShowcaseSubmissionsQuerySchema),
  catchAsync(projectShowcaseSubmissionController.list),
);
