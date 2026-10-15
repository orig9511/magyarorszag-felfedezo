import { resolve } from "node:path";

// src/ and dist/ occupy the same level, regardless of npm workspace's working directory.
// Backend-local settings take precedence over the repository fallback; process env wins in Nest.
export const environmentFiles = [
  resolve(__dirname, "../.env"),
  resolve(__dirname, "../../../.env"),
];

export function requireDatabaseUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(
      "DATABASE_URL is required. Set it in the process environment, apps/backend/.env or repository-root .env.",
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    // Never include the supplied value or URL parser error: they may expose credentials.
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
  }
  return value;
}
