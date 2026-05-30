/**
 * client/src/lib/clerkConfig.ts
 *
 * Clerk authentication configuration and helper exports.
 *
 * What this file will do:
 *  - Export the Clerk publishable key from the VITE_ env var.
 *  - Export any Clerk appearance / branding overrides used across the app.
 *  - Export helper wrappers around Clerk hooks if needed (e.g. a typed
 *    useAuth wrapper that always returns a non-null user inside protected routes).
 */

export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn(
    "[ReadShift] VITE_CLERK_PUBLISHABLE_KEY is not set. Auth will not work."
  );
}

// TODO: add Clerk appearance overrides
// TODO: export typed auth helpers
