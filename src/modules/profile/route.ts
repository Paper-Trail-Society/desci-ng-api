import { Router } from "express";
import { validateRequest } from "../../middlewares/validate-request";
import { ProfileController } from "./controller";
import { profileParamsSchema } from "./schema";
import { ProfileService } from "./service";

export const profileRouter = Router();

const profileController = new ProfileController(new ProfileService());

profileRouter.get(
  "/profile/:userId",
  validateRequest("params", profileParamsSchema),
  profileController.getByUserId,
);
