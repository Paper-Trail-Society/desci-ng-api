import "dotenv/config";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import { institutionsTable, usersTable } from "./db/schema";
import { fieldRouter } from "./modules/fields/route";
import { keywordRouter } from "./modules/keywords/route";
import { papersRouter } from "./modules/papers/route";
import { auth } from "./utils/auth";
import { adminAuth } from "./utils/admin-auth";
import { db } from "./config/db";
import { logger, httpLogger } from "./config/logger";
import errorHandler from "./middlewares/error-handler";
import { requestContext } from "./middlewares/request-context";
import { donationRouter } from "./modules/donation/route";
import { profileRouter } from "./modules/profile/route";
import { projectShowcaseSubmissionRouter } from "./modules/project-showcase-submissions/route";
import { eq } from "drizzle-orm";

const app = express();

app.use(requestContext);
app.use(httpLogger);
const CORS_ORIGINS = (
  process.env.FRONTEND_URLS || "http://localhost:3000,http://localhost:3001"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
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

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

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

  const user = {...session.user} as typeof session.user & {
    institution?: { id: number; name: string } | null;
  };

  if (user.institutionId) {
    try {
      const institution = await db
        .select({
          id: institutionsTable.id,
          name: institutionsTable.name,
        })
        .from(institutionsTable)
        .where(eq(institutionsTable.id, user.institutionId))
        .limit(1)
        .then((rows) => rows[0]);

      user.institution = institution;
    } catch (error) {
      logger.error(
        { userId: session.user.id, institutionId: session.user.institutionId },
        "Error fetching institution details for user",
      );
      user.institution = null;
    }
  }

  session.user = user;

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

app.use(papersRouter);
app.use(fieldRouter);
app.use(keywordRouter);
app.use(donationRouter);
app.use(profileRouter);
app.use(projectShowcaseSubmissionRouter);

app.get("/", (_req: Request, res: Response) => {
  res.send("Nubian Research API - Decentralized Science Platform");
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
    logger.error(error, "Health check failed:");
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      authenticated: false,
    });
  }
});

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
    logger.error(error, "Get institutions error:");
    res.status(500).json({
      status: "error",
      message: "Failed to fetch institutions",
    });
  }
});

// Catch 404 routes
app.use((req: Request, res: Response) => {
  return res.status(404).json({
    status: "error",
    message: "Route not Found",
  });
});

// Register error handler middleware
app.use(errorHandler);

export default app;
