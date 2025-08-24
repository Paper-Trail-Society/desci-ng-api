import { Router } from "express";
import { PapersController } from "./controller";
import multer from "multer";
import { validateRequest } from "middlewares/validate-request";
import { uploadPaper, fetchPapersQueryParams, updatePaper } from "./schema";
import z from "zod";

export const papersRouter = Router();
const papersController = new PapersController();

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

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
  upload.single("pdfFile"),
  validateRequest("body", uploadPaper),
  async (req, res) => papersController.create(req, res)
);

papersRouter.get("/papers", validateRequest('query', fetchPapersQueryParams), async (req, res) => papersController.index(req, res));

papersRouter.put(
  "/papers/:id",
  validateRequest("params", z.object({ id: z.preprocess((v) => Number(v), z.number()) })),
  upload.single("pdfFile"),
  validateRequest("body", updatePaper),
  async (req, res) => papersController.update(req, res)
);

