import express from "express";
import type { Request, Response } from "express";
import { db } from "./db/index";
import { sql } from "drizzle-orm";

// Explicitly indicate if we're in a serverless environment
const isServerless =
  process.env.NETLIFY === "true" || process.env.NODE_ENV === "production";

const app = express();
const port = process.env.PORT || 8080;

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set appropriate headers for CORS if needed
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

// Home route
app.get("/", (req: Request, res: Response) => {
  res.send("DeSci API - Decentralized Science Platform");
});

// Health check endpoint
app.get("/health", async (req: Request, res: Response) => {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    res.json({ status: "healthy", database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ status: "unhealthy", database: "disconnected" });
  }
});

// Start the server only when not running as a serverless function
if (process.env.NETLIFY !== "true" && process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`DeSci API listening on port ${port}`);
  });
}

// Make sure to correctly export the Express app for serverless functions
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
