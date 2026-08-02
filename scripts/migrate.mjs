import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run database migrations.");
}

const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL_MODE === "no-verify"
    ? { rejectUnauthorized: false }
    : process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : undefined
});

try {
  await pool.query(sql);
  console.log("Database schema is ready.");
} finally {
  await pool.end();
}
