import { Router } from "express";
import { KeywordController } from "./controller";

export const keywordRouter = Router();
const keywordController = new KeywordController();


keywordRouter.get(
  "/keywords",
  async (req, res) => keywordController.index(req, res),
);
