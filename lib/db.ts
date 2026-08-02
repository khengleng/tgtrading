import { Pool } from "pg";

let pool: Pool | undefined;

export function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  const ssl = process.env.DATABASE_SSL_MODE === "no-verify"
    ? { rejectUnauthorized: false }
    : process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : undefined;
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, ssl });
  return pool;
}
