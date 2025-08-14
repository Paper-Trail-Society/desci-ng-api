import express from "express";
import type { Request, Response } from "express";
import { db } from "./db/index.js";
import { papers, users } from "./db/schema.js";
import { paperRepository } from "./repositories/papers.js";
import { sql } from "drizzle-orm";

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Home route
app.get("/", (req: Request, res: Response) => {
  res.send("DeSci API - Decentralized Science Platform");
});

// Get all papers
app.get("/api/papers", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const searchTerm = (req.query.search as string) || "";

    const papers = await paperRepository.getPapers({
      page,
      limit,
      searchTerm,
      isPublic: true,
    });

    res.json(papers);
  } catch (error) {
    console.error("Error fetching papers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get paper by UUID
app.get("/api/papers/:uuid", async (req: Request, res: Response) => {
  try {
    const paper = await paperRepository.getByUuid(req.params.uuid);

    if (!paper) {
      return res.status(404).json({ error: "Paper not found" });
    }

    // Increment view count
    await paperRepository.incrementViewCount(paper.id);

    // Get paper tags
    const tags = await paperRepository.getPaperTags(paper.id);

    res.json({ paper, tags });
  } catch (error) {
    console.error("Error fetching paper:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new paper
app.post("/api/papers", async (req: Request, res: Response) => {
  try {
    const { title, abstract, authorId, isPublic, tagIds } = req.body;

    if (!title || !abstract || !authorId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const paper = await paperRepository.createPaper({
      title,
      abstract,
      authorId,
      isPublic,
      tagIds,
    });

    res.status(201).json(paper);
  } catch (error) {
    console.error("Error creating paper:", error);
    res.status(500).json({ error: "Internal server error" });
  }
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

// Handle shutdown gracefully
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  // Close database connection
  try {
    await db.end();
    console.log("Database connection closed");
  } catch (err) {
    console.error("Error closing database connection:", err);
  }
  process.exit(0);
});
