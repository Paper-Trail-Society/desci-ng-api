import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import cors from "cors";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import express from "express";
import { papersRouter } from "modules/papers/route";
import { fieldRouter } from "modules/fields/route";
import "multer";
import multer from "multer";
import { auth } from "utils/auth";
import { pinata } from "./db/pinata";
import { papersTable, usersTable } from "./db/schema";
import { requireAuth, type AuthenticatedRequest } from "./middlewares/auth";
import { db } from "./utils/db";
import { keywordRouter } from "modules/keywords/route";

interface MulterRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

const upload = multer({ dest: "uploads/" });
const isServerless =
  process.env.NETLIFY === "true" || process.env.NODE_ENV === "production";

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true, // Allow cookies, Authorization headers, etc.
  })
);

// better-auth requires access to the raw request body to handle authentication requests correctly.
// Therefore, the better-auth handler must be mounted before any middleware that parses the request body,
// such as express.json()
app.all("/auth/{*any}", toNodeHandler(auth));

app.get("/auth/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});

// Increase the payload size limit for JSON and URL-encoded bodies
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
    return res.status(200).json({});
  }
  next();
});

app.use(papersRouter);
app.use(fieldRouter);
app.use(keywordRouter);

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
  }
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
