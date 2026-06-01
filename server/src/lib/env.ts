/**
 * server/src/lib/env.ts
 * Separate file to ensure environment variables are loaded before any other module.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

// Polyfill global fetch in Node 16
if (!globalThis.fetch) {
  (globalThis as any).fetch = fetch;
  (globalThis as any).Headers = (fetch as any).Headers;
  (globalThis as any).Request = (fetch as any).Request;
  (globalThis as any).Response = (fetch as any).Response;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Go up two levels from src/lib to get to the root server folder where .env lives
dotenv.config({ path: path.join(__dirname, "../../.env") });

if (!process.env.SUPABASE_URL) {
  console.warn("⚠️ SUPABASE_URL is missing from environment variables");
}

if (process.env.NODE_ENV !== "development" && process.env.ALLOW_DEV_TOKEN === "true") {
  throw new Error("ALLOW_DEV_TOKEN must be false outside development");
}
