import { Router } from "express";
import { KeywordController } from "./controller";
import { validateRequest } from "@/middlewares/validate-request";
import { getKeywordsQueryParams } from "./schema";

export const keywordRouter = Router();
const keywordController = new KeywordController();

keywordRouter.get(
  "/keywords",
  validateRequest("query", getKeywordsQueryParams),
  async (req, res) => keywordController.index(req, res),
);
