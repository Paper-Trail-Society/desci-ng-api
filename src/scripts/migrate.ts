import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables
dotenv.config();

/**
 * Find the project root directory (where package.json is located)
 */
function findProjectRoot(): string {
  let currentDir = __dirname;

  // Go up the directory tree until we find package.json
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, "package.json"))) {
      return currentDir;
    }

    // Move up one directory
    currentDir = path.dirname(currentDir);
  }

  // Fallback to current working directory
  return process.cwd();
}

/**
 * Run database migrations
 */
async function runMigrations() {
  // Check for database credentials
  if (
    !process.env.DB_USER ||
    !process.env.DB_PASS ||
    !process.env.DB_HOST ||
    !process.env.DB_NAME ||
    !process.env.DB_PORT
  ) {
    console.error("❌ Database environment variables are not set");
    process.exit(1);
  }
  console.log("🔄 Starting database migration...");

  try {
    // Create postgres client
    const migrationClient = postgres("", {
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT, 10),
      max: 1,
    });

    // Create drizzle instance
    const db = drizzle(migrationClient);

    // Find migrations folder
    const projectRoot = findProjectRoot();
    const migrationsFolder = path.join(projectRoot, "drizzle", "migrations");

    // Verify migrations folder exists
    if (!fs.existsSync(migrationsFolder)) {
      console.error(`❌ Migrations folder not found at: ${migrationsFolder}`);
      console.log("💡 Run 'npm run db:generate' to create initial migrations");
      process.exit(1);
    }

    console.log(`📁 Using migrations from: ${migrationsFolder}`);

    // Run migrations
    await migrate(db, { migrationsFolder });

    console.log("✅ Migration completed successfully!");

    // Close the client connection
    await migrationClient.end();

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch((err) => {
  console.error("❌ Unhandled error during migration:", err);
  process.exit(1);
});
