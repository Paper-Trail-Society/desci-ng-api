"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const logger_1 = require("./config/logger");
const port = process.env.PORT || 3000;
// Only start the HTTP server when not running tests.
// Vitest sets NODE_ENV to "test", so importing this module
// in tests will not attempt to bind to a TCP port.
app_1.default.listen(port, (error) => {
    if (error) {
        logger_1.logger.error(error, "An error occured while starting API server");
        process.exit(1);
    }
    logger_1.logger.info(`Nubian Research API listening on port ${port}`);
});
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
process.on("uncaughtException", (err) => {
    logger_1.logger.error(`Uncaught Exception: ${err.message}`);
    process.exit(1); // Exit to prevent an unstable state
});
process.on("unhandledRejection", (reason, promise) => {
    logger_1.logger.error(promise, "Unhandled Rejection reason:", reason);
    process.exit(1);
});
//# sourceMappingURL=index.js.map