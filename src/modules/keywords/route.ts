import { Router } from "express";
import { KeywordController } from "./controller";
import { getKeywordsQueryParams } from "./schema";
import { validateRequest } from "../../middlewares/validate-request";

export const keywordRouter = Router();
const keywordController = new KeywordController();

keywordRouter.get(
  "/keywords",
  validateRequest("query", getKeywordsQueryParams),
  async (req, res) => keywordController.index(req, res),
);
