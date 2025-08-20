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
const route_1 = require("modules/papers/route");
const upload = (0, multer_1.default)({ dest: "uploads/" });
const isServerless = process.env.NETLIFY === "true" || process.env.NODE_ENV === "production";
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
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
        await db_1.db.select().from(schema_1.usersTable);
        res.json({ status: "healthy", database: "connected" });
    }
    catch (error) {
        console.error("Health check failed:", error);
        res.status(500).json({ status: "unhealthy", database: "disconnected" });
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