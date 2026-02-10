import { Router } from "express";
import { PapersController } from "./controller";
import multer from "multer";
import { validateRequest } from "../../middlewares/validate-request";
import {
  uploadPaper,
  fetchPapersQueryParams,
  updatePaper,
  getPaperSchema,
} from "./schema";
import z from "zod";
import { authMiddleware } from "../../middlewares/auth";
import { adminAuthMiddleware } from "../../middlewares/auth/admin-auth";
import ApiError from "../../utils/api-error";

export const papersRouter = Router();
const papersController = new PapersController();

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  dest: "uploads/papers",
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new ApiError("Only PDF file type is allowed!", 400));
    }

    cb(null, true);
  },
});

papersRouter.post(
  "/papers",
  authMiddleware({}),
  upload.single("file"),
  validateRequest("body", uploadPaper),
  papersController.create,
);

papersRouter.get(
  "/papers",
  adminAuthMiddleware({ optional: true }),
  authMiddleware({ optional: true }),
  validateRequest("query", fetchPapersQueryParams),
  papersController.index,
);

papersRouter.get(
  "/papers/:id",
  authMiddleware({ optional: true }),
  validateRequest("params", getPaperSchema),
  papersController.getPaperByIdOrSlug,
);

papersRouter.put(
  "/papers/:id",
  adminAuthMiddleware({ optional: true }),
  authMiddleware({}),
  validateRequest(
    "params",
    z.object({ id: z.preprocess((v) => Number(v), z.number()) }),
  ),
  upload.single("file"),
  validateRequest("body", updatePaper),
  papersController.update,
);

papersRouter.delete(
  "/papers/:id",
  authMiddleware({}),
  validateRequest(
    "params",
    z.object({ id: z.preprocess((v) => Number(v), z.number()) }),
  ),
  papersController.delete,
);
