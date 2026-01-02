import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { sql } from "drizzle-orm";
import * as schema from "../db/schema";

// Load environment variables
dotenv.config();

/**
 * Check database schema against code
 */
async function checkSchema() {
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

  console.log("🔍 Checking database schema...");

  try {
    // Create postgres client
    const client = postgres("", {
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT, 10),
    });

    // Create drizzle instance with schema
    const db = drizzle(client, { schema });

    // Check if tables exist
    console.log("📊 Checking existing tables...");

    // Get all table names from the database
    const tableResults = await db.execute(sql`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    `);

    const existingTables = tableResults.map((row) => row.tablename);

    if (existingTables.length === 0) {
      console.log("⚠️ No tables found in the database.");
    } else {
      console.log(`📋 Existing tables: ${existingTables.join(", ")}`);
    }

    // List tables defined in schema
    const schemaTables = Object.keys(schema)
      .filter((key) => key.endsWith("Table"))
      .map((key) => (schema as any)[key]._.name);

    if (schemaTables.length === 0) {
      console.log("⚠️ No tables defined in the schema.");
    } else {
      console.log(`📋 Schema tables: ${schemaTables.join(", ")}`);
    }

    // Check if all schema tables exist
    const missingTables = schemaTables.filter(
      (table) => !existingTables.includes(table),
    );
    const extraTables = existingTables.filter(
      (table) => !schemaTables.includes(table),
    );

    if (missingTables.length === 0) {
      console.log("✅ All schema tables exist in the database.");
    } else {
      console.log(
        `⚠️ Tables defined in schema but missing from database: ${missingTables.join(", ")}`,
      );
      console.log("💡 Run 'npm run db:migrate' to create these tables.");
    }

    if (extraTables.length > 0) {
      console.log(
        `ℹ️ Tables in database but not in schema: ${extraTables.join(", ")}`,
      );
    }

    // Verify table structure for existing tables
    for (const tableName of schemaTables) {
      if (existingTables.includes(tableName)) {
        console.log(`🔍 Checking columns for table: ${tableName}`);

        // Get column information for this table
        const columnResults = await db.execute(sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = ${tableName}
        `);

        console.log(`📊 ${tableName} has ${columnResults.length} columns:`);

        // Display column details
        columnResults.forEach((col) => {
          console.log(
            `   - ${col.column_name} (${col.data_type}, ${col.is_nullable === "YES" ? "nullable" : "not null"})`,
          );
        });
      }
    }

    console.log("✅ Schema check completed!");

    // Close the client connection
    await client.end();

    process.exit(0);
  } catch (error) {
    console.error("❌ Schema check failed:", error);
    process.exit(1);
  }
}

// Run schema check
checkSchema().catch((err) => {
  console.error("❌ Unhandled error during schema check:", err);
  process.exit(1);
});
