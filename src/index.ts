import "dotenv/config";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import cors from "cors";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import express from "express";
import { institutionsTable, papersTable, usersTable } from "./db/schema";
import { requireAuth, type AuthenticatedRequest } from "./middlewares/auth";
import { fieldRouter } from "./modules/fields/route";
import { keywordRouter } from "./modules/keywords/route";
import { papersRouter } from "./modules/papers/route";
import { auth } from "./utils/auth";
import { adminAuth } from "./utils/admin-auth";
import { db } from "./utils/db";
import morgan from "morgan";

const app = express();
const port = process.env.PORT || 3000;

app.use(morgan("dev"));
app.use(
  cors({
    origin: (
      process.env.FRONTEND_URLS || "http://localhost:3000,http://localhost:3001"
    )
      .split(",")
      .filter(Boolean),
    credentials: true, // Allow cookies and Authorization headers
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
);

// better-auth requires access to the raw request body to handle authentication requests correctly.
// Therefore, the better-auth handler must be mounted before any middleware that parses the request body,
// such as express.json()
app.all("/auth/{*any}", toNodeHandler(auth));
app.all("/admin-auth/{*any}", toNodeHandler(adminAuth));

app.get("/user/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required to get user details",
    });
  }
  return res.json(session);
});

app.get("/admin/me", async (req, res) => {
  const session = await adminAuth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required to get user details",
    });
  }
  return res.json(session);
});

// JWT token endpoint - get a JWT token for authenticated users
app.get("/user/jwt-token", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required to get JWT token",
    });
  }

  // The JWT token will be automatically included in the response headers
  // when using the JWT plugin
  return res.json({
    status: "success",
    message: "JWT token generated successfully",
    user: session.user,
  });
});

// Increase the payload size limit for JSON and URL-encoded bodies
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

app.use(papersRouter);
app.use(fieldRouter);
app.use(keywordRouter);

app.get("/", (_req: Request, res: Response) => {
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
  },
);

// Get all institutions
app.get("/institutions", async (_req: Request, res: Response) => {
  try {
    const institutions = await db
      .select({
        id: institutionsTable.id,
        name: institutionsTable.name,
      })
      .from(institutionsTable)
      .orderBy(institutionsTable.name);

    res.json({
      status: "success",
      institutions,
    });
  } catch (error) {
    console.error("Get institutions error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch institutions",
    });
  }
});

// if (process.env.NETLIFY !== "true" && process.env.NODE_ENV !== "production") {
app.listen(port, () => {
  console.log(`DeSci API listening on port ${port}`);
});
// }

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
