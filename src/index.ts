import app from "./app";
import { db } from "./config/db";
import { logger } from "./config/logger";

const port = process.env.PORT || 3000;

app.listen(port, (error) => {
  if (error) {
    logger.error(error, "An error occured while starting API server");
    process.exit(1);
  }
  logger.info(`Nubian Research API listening on port ${port}`);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  try {
    // free up DB connections
    await db.$client.end();
    logger.info("Database connection closed");
  } catch (err) {
    logger.error(err, "Error closing database connection:");
  }
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1); // Exit to prevent an unstable state
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(promise, "Unhandled Rejection reason:", reason);
  process.exit(1);
});
