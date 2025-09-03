import { Router } from "express";
import { FieldController } from "./controller";

export const fieldRouter = Router();
const fieldController = new FieldController();

fieldRouter.get("/fields", async (req, res) => fieldController.index(req, res));

fieldRouter.get(
  "/fields/:id/categories",
  async (req, res) => fieldController.getFieldCategories(req, res),
);
