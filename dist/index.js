"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("./db/index");
const drizzle_orm_1 = require("drizzle-orm");
const app = (0, express_1.default)();
const port = process.env.PORT;
// Middleware to parse JSON
app.use(express_1.default.json());
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
// Start the server
app.listen(port, () => {
    console.log(`DeSci API listening on port ${port}`);
});
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
