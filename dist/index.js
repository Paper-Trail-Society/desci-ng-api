"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("./utils/db");
const schema_1 = require("./db/schema");
require("multer");
const multer_1 = __importDefault(require("multer"));
const pinata_1 = require("./db/pinata");
const node_1 = require("better-auth/node");
const auth_1 = require("utils/auth");
const route_1 = require("modules/papers/route");
const auth_2 = require("./middlewares/auth");
const drizzle_orm_1 = require("drizzle-orm");
const upload = (0, multer_1.default)({ dest: "uploads/" });
const isServerless = process.env.NETLIFY === "true" || process.env.NODE_ENV === "production";
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// better-auth requires access to the raw request body to handle authentication requests correctly.
// Therefore, the better-auth handler must be mounted before any middleware that parses the request body,
// such as express.json()
app.all("/auth/{*any}", (0, node_1.toNodeHandler)(auth_1.auth));
// Increase the payload size limit for JSON and URL-encoded bodies
app.use(express_1.default.json({ limit: "100mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "100mb" }));
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
        return res.status(200).json({});
    }
    next();
});
app.use(route_1.papersRouter);
app.get("/", (req, res) => {
    res.send("DeSci API - Decentralized Science Platform");
});
// Health check endpoint
app.get("/health", async (req, res) => {
    try {
        // Check database connection
        await db_1.db.select().from(schema_1.usersTable);
        // Check authentication status (optional)
        let authStatus = "not_authenticated";
        try {
            const session = await auth_1.auth.api.getSession({
                headers: (0, node_1.fromNodeHeaders)(req.headers),
            });
            if (session) {
                authStatus = "authenticated";
            }
        }
        catch {
            // Auth check failed, but health check can still pass
        }
        res.json({
            status: "healthy",
            database: "connected",
            authentication: authStatus,
        });
    }
    catch (error) {
        console.error("Health check failed:", error);
        res.status(500).json({
            status: "unhealthy",
            database: "disconnected",
            authentication: "unknown",
        });
    }
});
app.get("/auth/me", async (req, res) => {
    const session = await auth_1.auth.api.getSession({
        headers: (0, node_1.fromNodeHeaders)(req.headers),
    });
    return res.json(session);
});
// Protected endpoint to get current user's papers
app.get("/papers/my", auth_2.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Fetch all papers belonging to the authenticated user
        const userPapers = await db_1.db
            .select()
            .from(schema_1.papersTable)
            .where((0, drizzle_orm_1.eq)(schema_1.papersTable.userId, userId));
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
    }
    catch (error) {
        console.error("Failed to fetch user papers:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to retrieve your papers",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
app.post("/files/upload", auth_2.requireAuth, upload.single("pdfFile"), async (req, res) => {
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
        const pinataResponse = await pinata_1.pinata.upload.public.file(file);
        console.log("Pinata response:", pinataResponse);
        // Store document information in database
        // Use the authenticated user's ID instead of body parameter
        const [newDocument] = await db_1.db
            .insert(schema_1.papersTable)
            .values({
            title,
            notes: "",
            abstract: abstract || "",
            userId: req.user.id, // Use authenticated user's ID
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
    }
    catch (error) {
        console.error("PDF upload failed:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to upload PDF. Please check your connection and try again",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
if (process.env.NETLIFY !== "true" && process.env.NODE_ENV !== "production") {
    app.listen(port, () => {
        console.log(`DeSci API listening on port ${port}`);
    });
}
module.exports = app;
module.exports.default = app;
exports.default = app;
process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully");
    try {
        // await db.end();
        console.log("Database connection closed");
    }
    catch (err) {
        console.error("Error closing database connection:", err);
    }
    process.exit(0);
});
//# sourceMappingURL=index.js.map