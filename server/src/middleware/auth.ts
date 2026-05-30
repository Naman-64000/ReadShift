/**
 * server/src/middleware/auth.ts
 * Supabase JWT validation middleware.
 */

import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types/index.js";
import { authService } from "../services/authService.js";

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; authProviderId: string; email: string; isAdmin: boolean };
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("UNAUTHORIZED", "Missing authorization token", 401);
    }

    const token = authHeader.slice(7);

    // Optional local/dev bypass for mock mode only.
    if (
      token === "dev-token" &&
      process.env.ALLOW_DEV_TOKEN === "true" &&
      process.env.NODE_ENV === "development"
    ) {
      const devAuth = { sub: "dev-user-123", email: "dev@readshift.local", iat: 0, exp: 0 };
      const user = await authService.getOrCreateUser(devAuth);
      req.auth = { userId: user.id, authProviderId: devAuth.sub, email: devAuth.email, isAdmin: user.is_admin };
      return next();
    }

    const payload = await authService.verifyToken(token);
    const user = await authService.getOrCreateUser(payload);

    req.auth = {
      userId: user.id,
      authProviderId: payload.sub,
      email: payload.email,
      isAdmin: user.is_admin,
    };

    next();
  } catch (err) {
    next(err);
  }
}
