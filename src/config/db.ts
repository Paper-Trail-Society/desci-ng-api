import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";

if (
  !process.env.DB_USER ||
  !process.env.DB_PASS ||
  !process.env.DB_HOST ||
  !process.env.DB_NAME ||
  !process.env.DB_PORT
) {
  throw new Error("Missing database credentials");
}

const client = postgres("", {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10),
  prepare: false,
});
export const db = drizzle(client, { schema });
