"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("better-auth/node");
const cors_1 = __importDefault(require("cors"));
const drizzle_orm_1 = require("drizzle-orm");
const express_1 = __importDefault(require("express"));
const schema_1 = require("./db/schema");
const auth_1 = require("./middlewares/auth");
const route_1 = require("./modules/fields/route");
const route_2 = require("./modules/keywords/route");
const route_3 = require("./modules/papers/route");
const auth_2 = require("./utils/auth");
const db_1 = require("./utils/db");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true, // Allow cookies, Authorization headers, etc.
}));
// better-auth requires access to the raw request body to handle authentication requests correctly.
// Therefore, the better-auth handler must be mounted before any middleware that parses the request body,
// such as express.json()
app.all("/auth/{*any}", (0, node_1.toNodeHandler)(auth_2.auth));
app.get("/auth/me", async (req, res) => {
    const session = await auth_2.auth.api.getSession({
        headers: (0, node_1.fromNodeHeaders)(req.headers),
    });
    return res.json(session);
});
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
app.use(route_3.papersRouter);
app.use(route_1.fieldRouter);
app.use(route_2.keywordRouter);
app.get("/", (req, res) => {
    res.send("DeSci API - Decentralized Science Platform");
});
// Health check endpoint
app.get("/health", async (req, res) => {
    try {
        // Check database connection
        await db_1.db.select().from(schema_1.usersTable);
        // Check if request is authenticated
        let isAuthenticated = false;
        try {
            const session = await auth_2.auth.api.getSession({
                headers: (0, node_1.fromNodeHeaders)(req.headers),
            });
            if (session) {
                isAuthenticated = true;
            }
        }
        catch {
            // Not authenticated
        }
        res.json({
            status: "healthy",
            database: "connected",
            authenticated: isAuthenticated,
        });
    }
    catch (error) {
        console.error("Health check failed:", error);
        res.status(500).json({
            status: "unhealthy",
            database: "disconnected",
            authenticated: false,
        });
    }
});
// Protected endpoint to get current user's papers
app.get("/papers/my", auth_1.requireAuth, async (req, res) => {
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
// Update user profile with institution and areas of interest
app.put("/profile", auth_1.requireAuth, async (req, res) => {
    try {
        const { institutionId, areasOfInterest } = req.body;
        const userId = req.user.id;
        await db_1.db
            .update(schema_1.usersTable)
            .set({
            institutionId: institutionId || null,
            areasOfInterest: areasOfInterest || [],
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, userId));
        res.json({
            status: "success",
            message: "Profile updated successfully",
        });
    }
    catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to update profile",
        });
    }
});
// Get all institutions
app.get("/institutions", async (req, res) => {
    try {
        const institutions = await db_1.db
            .select({
            id: schema_1.institutionsTable.id,
            name: schema_1.institutionsTable.name,
        })
            .from(schema_1.institutionsTable)
            .orderBy(schema_1.institutionsTable.name);
        res.json({
            status: "success",
            institutions,
        });
    }
    catch (error) {
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