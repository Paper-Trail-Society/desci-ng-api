import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!process.env.SUPABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);

export { pool };

export async function closePool() {
  await pool.end();
}

// Error handling for the pool
pool.on("error", (err) => {
  console.error("Unexpected error on idle database client", err);
  process.exit(-1);
});
