"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("./db/index");
const drizzle_orm_1 = require("drizzle-orm");
// Explicitly indicate if we're in a serverless environment
const isServerless = process.env.NETLIFY === "true" || process.env.NODE_ENV === "production";
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
// Middleware to parse JSON
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Set appropriate headers for CORS if needed
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
        return res.status(200).json({});
    }
    next();
});
// Home route
app.get("/", (req, res) => {
    res.send("DeSci API - Decentralized Science Platform");
});
// Health check endpoint
app.get("/health", async (req, res) => {
    try {
        // Test database connection
        await index_1.db.execute((0, drizzle_orm_1.sql) `SELECT 1`);
        res.json({ status: "healthy", database: "connected" });
    }
    catch (error) {
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
