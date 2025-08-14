import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!, {
  pass: process.env.DATABASE_KEY,
});
export const db = drizzle({ client });
