/**
 * client/src/lib/apiClient.ts
 */
import axios, { type AxiosError } from "axios";
import { supabase } from "./supabase";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

apiClient.interceptors.request.use(async (config) => {
  try {
    // 1. Check for mock dev session
    const mockUser = localStorage.getItem("readshift_dev_user");
    if (mockUser) {
      config.headers.Authorization = `Bearer dev-token`;
      return config;
    }

    // 2. Otherwise check Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // proceed without auth
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { code: string; message: string } }>) => {
    const apiError = error.response?.data?.error;
    const code = apiError?.code;
    let message = apiError?.message ?? error.message ?? "An error occurred";

    // 1. Technical/Internal system checks
    const isTechnical =
      code === "INTERNAL_ERROR" ||
      /prisma|postgres|sql|database|query|connection pool|connect/i.test(message) ||
      message.includes("at ") ||
      message.includes("Error:") ||
      message.includes("TypeError");

    if (isTechnical) {
      message = "We are experiencing a temporary server issue. Please try again in a few moments.";
    } else if (code === "POOL_EXHAUSTED") {
      message = "All passages in this domain have been completed! Please calibrate again or try a different reading domain.";
    } else if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
      message = "Your session has expired. Please sign in again.";
    } else if (code === "VALIDATION_ERROR") {
      if (/validation|zod|schema|invalid type|required/i.test(message)) {
        message = "Invalid options selected. Please check your configurations and try again.";
      }
    } else if (error.code === "ERR_NETWORK" || !error.response) {
      message = "Unable to connect to ReadShift. Please verify your internet connection and try again.";
    }

    return Promise.reject(new Error(message));
  }
);
