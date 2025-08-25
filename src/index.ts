import express from "express";
import type { Request, Response } from "express";
import { db } from "./utils/db";
import { papersTable, usersTable } from "./db/schema";
import "multer";
import multer from "multer";
import { pinata } from "./db/pinata";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "utils/auth";
import { papersRouter } from "modules/papers/route";
import { requireAuth, type AuthenticatedRequest } from "./middlewares/auth";
import { eq } from "drizzle-orm";

interface MulterRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

const upload = multer({ dest: "uploads/" });
const isServerless =
  process.env.NETLIFY === "true" || process.env.NODE_ENV === "production";

const app = express();
const port = process.env.PORT || 3000;

// better-auth requires access to the raw request body to handle authentication requests correctly.
// Therefore, the better-auth handler must be mounted before any middleware that parses the request body,
// such as express.json()
app.all("/auth/{*any}", toNodeHandler(auth));

// Increase the payload size limit for JSON and URL-encoded bodies
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
    return res.status(200).json({});
  }
  next();
});

app.use(papersRouter);

app.get("/", (req: Request, res: Response) => {
  res.send("DeSci API - Decentralized Science Platform");
});

// Health check endpoint
app.get("/health", async (req: Request, res: Response) => {
  try {
    // Check database connection
    await db.select().from(usersTable);

    // Check if request is authenticated
    let isAuthenticated = false;
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (session) {
        isAuthenticated = true;
      }
    } catch {
      // Not authenticated
    }

    res.json({
      status: "healthy",
      database: "connected",
      authenticated: isAuthenticated,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      authenticated: false,
    });
  }
});

app.get("/auth/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});

// Protected endpoint to get current user's papers
app.get(
  "/papers/my",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      // Fetch all papers belonging to the authenticated user
      const userPapers = await db
        .select()
        .from(papersTable)
        .where(eq(papersTable.userId, userId));

      res.json({
        status: "success",
        papers: userPapers.map((paper) => ({
          id: paper.id,
          title: paper.title,
          abstract: paper.abstract,
          keywords: paper.keywords,
          ipfsCid: paper.ipfsCid,
          ipfsUrl: paper.ipfsUrl,
          createdAt: paper.createdAt,
          updatedAt: paper.updatedAt,
        })),
        count: userPapers.length,
      });
    } catch (error) {
      console.error("Failed to fetch user papers:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve your papers",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

app.post(
  "/files/upload",
  requireAuth,
  upload.single("pdfFile"),
  async (req: MulterRequest, res: Response) => {
    try {
      // Log request details for debugging
      console.log("Upload request received");
      console.log("Request body:", req.body);
      console.log("File received:", req.file ? "Yes" : "No");
      console.log("Authenticated user:", req.user?.email);

      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "No PDF file uploaded",
        });
      }

      const { title, abstract } = req.body;

      if (!title) {
        return res.status(400).json({
          status: "error",
          message: "PDF title is required",
        });
      }

      // Get file information
      const file = req.file;
      console.log("File details:", {
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
      });

      // Upload to Pinata
      const metadata = {
        title,
        abstract: abstract || "",
        originalFilename: file.originalname,
        contentType: file.mimetype,
      };

      // @ts-ignore
      const pinataResponse = await pinata.upload.public.file(file);
      console.log("Pinata response:", pinataResponse);

      // Store document information in database
      const [newDocument] = await db
        .insert(papersTable)
        .values({
          title,
          notes: "",
          abstract: abstract || "",
          userId: req.user!.id, // Use authenticated user's ID
          categoryId: 1, // Default category - you may want to make this configurable
          keywords: JSON.stringify([]),
          ipfsCid: pinataResponse.cid || "placeholder",
          ipfsUrl: `${process.env.PINATA_GATEWAY}/ipfs/${pinataResponse.cid || "placeholder"}`,
        })
        .returning();

      // Return success response
      res.status(201).json({
        status: "success",
        message: "PDF uploaded successfully",
        document: {
          id: newDocument.id,
          title: newDocument.title,
          abstract: newDocument.abstract,
          // ipfsHash: newDocument.ipfsHash,
          // ipfsUrl: `${process.env.PINATA_GATEWAY}/ipfs/${newDocument.ipfsHash}`,
          // filename: newDocument.filename,
          // filesize: newDocument.filesize,
          // createdAt: newDocument.createdAt,
        },
      });
    } catch (error) {
      console.error("PDF upload failed:", error);
      res.status(500).json({
        status: "error",
        message:
          "Failed to upload PDF. Please check your connection and try again",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

if (process.env.NETLIFY !== "true" && process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`DeSci API listening on port ${port}`);
  });
}

module.exports = app;
module.exports.default = app;
export default app;

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  try {
    // await db.end();
    console.log("Database connection closed");
  } catch (err) {
    console.error("Error closing database connection:", err);
  }
  process.exit(0);
});
