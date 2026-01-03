"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_1 = require("better-auth/node");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const schema_1 = require("./db/schema");
const route_1 = require("./modules/fields/route");
const route_2 = require("./modules/keywords/route");
const route_3 = require("./modules/papers/route");
const auth_1 = require("./utils/auth");
const admin_auth_1 = require("./utils/admin-auth");
const db_1 = require("./config/db");
const logger_1 = require("./config/logger");
const error_handler_1 = __importDefault(require("./middlewares/error-handler"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(logger_1.httpLogger);
app.use(express_1.default.json({ limit: "100mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "100mb" }));
app.use((0, cors_1.default)({
    origin: (process.env.FRONTEND_URLS || "http://localhost:3000,http://localhost:3001")
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
}));
// better-auth requires access to the raw request body to handle authentication requests correctly.
// Therefore, the better-auth handler must be mounted before any middleware that parses the request body,
// such as express.json()
app.all("/auth/{*any}", (0, node_1.toNodeHandler)(auth_1.auth));
app.all("/admin-auth/{*any}", (0, node_1.toNodeHandler)(admin_auth_1.adminAuth));
app.get("/user/me", async (req, res) => {
    const session = await auth_1.auth.api.getSession({
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
    const session = await auth_1.auth.api.getSession({
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
            const session = await auth_1.auth.api.getSession({
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
// Register error handler middleware
app.use(error_handler_1.default);
app.listen(port, (error) => {
    if (error) {
        logger_1.logger.error(error, "An error occured while starting API server");
        process.exit(1);
    }
    logger_1.logger.info(`DeSci API listening on port ${port}`);
});
module.exports = app;
module.exports.default = app;
exports.default = app;
process.on("SIGTERM", async () => {
    logger_1.logger.info("SIGTERM received, shutting down gracefully");
    try {
        // free up DB connections
        await db_1.db.$client.end();
        logger_1.logger.info("Database connection closed");
    }
    catch (err) {
        logger_1.logger.error(err, "Error closing database connection:");
    }
    process.exit(0);
});
//# sourceMappingURL=index.js.map