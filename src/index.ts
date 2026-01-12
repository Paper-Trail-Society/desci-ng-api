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

const app = express();
const port = process.env.PORT || 3000;

app.use(requestContext);
app.use(httpLogger);

app.use(
  cors({
    origin: (
      process.env.FRONTEND_URLS || "http://localhost:3000,http://localhost:3001"
    )
      .split(",")
      .map((s) => s.trim())
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

app.listen(port, (error) => {
  if (error) {
    logger.error(error, "An error occured while starting API server");
    process.exit(1);
  }
  logger.info(`DeSci API listening on port ${port}`);
});

module.exports = app;
module.exports.default = app;
export default app;

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  try {
    // free up DB connections
    await db.$client.end();
    logger.info("Database connection closed");
  } catch (err) {
    logger.error(err, "Error closing database connection:");
  }
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1); // Exit to prevent an unstable state
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(promise, "Unhandled Rejection reason:", reason);
  process.exit(1);
});
