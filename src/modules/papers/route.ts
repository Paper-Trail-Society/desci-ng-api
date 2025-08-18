import { Router } from "express";
import { PapersController } from "./controller";
import multer from "multer";
import { validateRequest } from "middlewares/validate-request";
import { uploadPaper } from "./schema";

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
  validateRequest(uploadPaper),
  upload.single("pdfFile"),
  async (req, res) => papersController.create(req, res)
);

papersRouter.get("/papers", async (req, res) => {
  return res.json(["paper 1", "paper 2"]);
});
