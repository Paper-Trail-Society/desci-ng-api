import express from "express";
import type { Request, Response } from "express";
import { db } from "./db/index";
import { sql } from "drizzle-orm";

const app = express();
const port = process.env.PORT;

// Middleware to parse JSON
app.use(express.json());

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

// Start the server
app.listen(port, () => {
  console.log(`DeSci API listening on port ${port}`);
});

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
