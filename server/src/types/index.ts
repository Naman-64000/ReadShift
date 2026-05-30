/**
 * server/src/types/index.ts
 *
 * Server-side shared TypeScript types and interfaces.
 *
 * What this file will contain:
 *  - AppError — custom error class with a code field for error handler mapping.
 *  - AuthPayload — shape of the decoded auth-provider JWT payload.
 *  - PassageGenerationJob — BullMQ job data type for passage warming.
 *  - PaginationParams — shared query param type for paginated endpoints.
 *  - PaginatedResult<T> — generic paginated response wrapper.
 */

/** Custom application error with machine-readable code */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Decoded Supabase JWT payload (minimal fields used by this app) */
export interface AuthPayload {
  sub: string;        // Supabase Auth user ID
  email: string;
  iat: number;
  exp: number;
}

/** BullMQ job data for passage generation tasks */
export interface PassageGenerationJobData {
  domain: string;
  level: number;
  count: number;      // Number of passages to generate in this job
}

/** Generic pagination params from query string */
export interface PaginationParams {
  page: number;
  limit: number;
}

/** Generic paginated response wrapper */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
