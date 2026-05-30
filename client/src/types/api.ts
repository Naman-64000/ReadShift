/**
 * client/src/types/api.ts
 *
 * Generic API response envelope types used across all API calls.
 */

/** Standard success envelope */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/** Standard error envelope */
export interface ApiError {
  success: false;
  error: {
    code: string;   // Machine-readable error code (e.g. "POOL_EXHAUSTED")
    message: string; // Human-readable message
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
