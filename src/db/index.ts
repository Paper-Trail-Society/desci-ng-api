import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 20000,
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
