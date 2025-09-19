"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
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
const admin_auth_1 = require("./utils/admin-auth");
const db_1 = require("./utils/db");
const morgan_1 = __importDefault(require("morgan"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, morgan_1.default)("dev"));
app.use((0, cors_1.default)({
    origin: (process.env.FRONTEND_URLS || "http://localhost:3000,http://localhost:3001")
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
}));
// better-auth requires access to the raw request body to handle authentication requests correctly.
// Therefore, the better-auth handler must be mounted before any middleware that parses the request body,
// such as express.json()
app.all("/auth/{*any}", (0, node_1.toNodeHandler)(auth_2.auth));
app.all("/admin-auth/{*any}", (0, node_1.toNodeHandler)(admin_auth_1.adminAuth));
app.get("/user/me", async (req, res) => {
    const session = await auth_2.auth.api.getSession({
        headers: (0, node_1.fromNodeHeaders)(req.headers),
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
    const session = await admin_auth_1.adminAuth.api.getSession({
        headers: (0, node_1.fromNodeHeaders)(req.headers),
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
    const session = await auth_2.auth.api.getSession({
        headers: (0, node_1.fromNodeHeaders)(req.headers),
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
app.use(express_1.default.json({ limit: "100mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "100mb" }));
app.use(route_3.papersRouter);
app.use(route_1.fieldRouter);
app.use(route_2.keywordRouter);
app.get("/", (_req, res) => {
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
// Get all institutions
app.get("/institutions", async (_req, res) => {
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