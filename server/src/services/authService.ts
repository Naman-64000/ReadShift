/**
 * server/src/services/authService.ts
 *
 * Auth service for validating Supabase JWTs and resolving the local user.
 */

import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "../lib/prisma.js";
import { AppError, type AuthPayload } from "../types/index.js";

const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL environment variable is missing");
}

const ISSUER = `${SUPABASE_URL}/auth/v1`;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

export const authService = {
  async verifyToken(token: string): Promise<AuthPayload> {
    try {
      const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });

      const sub = typeof payload.sub === "string" ? payload.sub : null;
      const email = typeof payload.email === "string" ? payload.email : null;
      const iat = typeof payload.iat === "number" ? payload.iat : 0;
      const exp = typeof payload.exp === "number" ? payload.exp : 0;

      if (!sub || !email) {
        throw new AppError("UNAUTHORIZED", "Token payload is missing required claims", 401);
      }

      return { sub, email, iat, exp };
    } catch (err) {
      console.error("[AuthService] Supabase token verification failed:", err);
      throw new AppError("UNAUTHORIZED", "Invalid or expired token", 401);
    }
  },

  async getUserByAuthId(authProviderId: string) {
    return prisma.user.findUnique({
      where: { clerk_id: authProviderId },
      include: { preferences: true },
    });
  },

  async getOrCreateUser(authPayload: AuthPayload) {
    const { sub, email } = authPayload;

    return prisma.user.upsert({
      where: { clerk_id: sub },
      update: {
        email,
      },
      create: {
        clerk_id: sub,
        email,
        preferences: {
          create: {
            roadmaps_enabled: false,
          },
        },
      },
      include: { preferences: true },
    });
  },
};
