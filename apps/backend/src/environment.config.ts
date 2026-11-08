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

/**
 * Explicit browser origins. Production defaults to no cross-origin browser access.
 * CORS is not authentication; protected endpoints always require the admin guard.
 */
export function allowedCorsOrigins(raw: string | undefined, environment: string | undefined): string[] {
  if (!raw || !raw.trim()) {
    return environment === "production"
      ? []
      : ["http://localhost:4200", "http://localhost:4201", "http://localhost:3000"];
  }
  const values = raw.split(",").map((value) => value.trim());
  if (values.some((value) => !value)) {
    throw new Error("CORS_ORIGINS must contain comma-separated HTTP(S) origins.");
  }
  for (const value of values) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error("CORS_ORIGINS must contain valid HTTP(S) origins.");
    }
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== value) {
      throw new Error("CORS_ORIGINS must contain HTTP(S) origins without paths.");
    }
  }
  return [...new Set(values)];
}
