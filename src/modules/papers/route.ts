import { AsyncResource } from "node:async_hooks";
import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
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
import { requireAuth } from "../../middlewares/auth";
import { adminAuthMiddleware } from "../../middlewares/auth/admin-auth";
import { getRequestContext } from "../../config/request-context";

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
  papersController.create,
);

papersRouter.get(
  "/papers",
  adminAuthMiddleware({ optional: true }),
  validateRequest("query", fetchPapersQueryParams),
  papersController.index,
);

papersRouter.get(
  "/papers/:id",
  validateRequest("params", getPaperSchema),
  papersController.getPaperByIdOrSlug,
);

// need to merge optional admin auth and required user auth middleware for this route
papersRouter.put(
  "/papers/:id",
  adminAuthMiddleware({ optional: true }),
  requireAuth,
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
  requireAuth,
  validateRequest(
    "params",
    z.object({ id: z.preprocess((v) => Number(v), z.number()) }),
  ),
  papersController.delete,
);
