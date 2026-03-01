import { Router } from "express";
import { PapersController } from "./controller";
import multer from "multer";
import { validateRequest } from "../../middlewares/validate-request";
import {
  uploadPaper,
  fetchPapersQueryParams,
  updatePaper,
  getPaperSchema,
  createPaperCommentSchema,
} from "./schema";
import z from "zod";
import { authMiddleware } from "../../middlewares/auth";
import { adminAuthMiddleware } from "../../middlewares/auth/admin-auth";
import ApiError from "../../utils/api-error";
import { PapersRepository } from "./repository";

export const papersRouter = Router();
const papersController = new PapersController(new PapersRepository());

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

papersRouter.post(
  "/papers/:paperId/comments",
  authMiddleware({}),
  validateRequest("params", z.object({ paperId: z.preprocess((v) => Number(v), z.number()) })),
  validateRequest("body", createPaperCommentSchema),
  papersController.createComment,
);

papersRouter.get(
  "/papers/:paperId/comments",
  validateRequest("params", z.object({ paperId: z.preprocess((v) => Number(v), z.number()) })),
  papersController.listComments,
);
