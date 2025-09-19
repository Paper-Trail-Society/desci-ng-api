import { Router } from "express";
import { PapersController } from "./controller";
import multer from "multer";
import { validateRequest } from "../../middlewares/validate-request";
import {
  uploadPaper,
  fetchPapersQueryParams,
  updatePaper,
  getPaperSchema,
  updatePaperStatusSchema,
} from "./schema";
import z from "zod";
import { requireAuth } from "../../middlewares/auth";
import { adminAuthMiddleware } from "middlewares/auth/admin-auth";

export const papersRouter = Router();
const papersController = new PapersController();

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  dest: "uploads/papers",
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF file type is allowed!"));
    }

    cb(null, true);
  },
});

papersRouter.post(
  "/papers",
  requireAuth,
  upload.single("file"),
  validateRequest("body", uploadPaper),
  async (req, res) => papersController.create(req, res)
);

papersRouter.get(
  "/papers",
  adminAuthMiddleware({ optional: true }),
  validateRequest("query", fetchPapersQueryParams),
  async (req, res) => papersController.index(req, res)
);

papersRouter.get(
  "/papers/:id",
  validateRequest("params", getPaperSchema),
  async (req, res) => papersController.getPaperById(req, res)
);

papersRouter.put(
  "/papers/:id",
  requireAuth,
  validateRequest(
    "params",
    z.object({ id: z.preprocess((v) => Number(v), z.number()) })
  ),
  upload.single("pdfFile"),
  validateRequest("body", updatePaper),
  async (req, res) => papersController.update(req, res)
);

papersRouter.put(
  "/papers/:id/update-status",
  adminAuthMiddleware({}),
  validateRequest("params", getPaperSchema),
  validateRequest("body", updatePaperStatusSchema),
  async (req, res) => papersController.updatePaperStatus(req, res)
);
