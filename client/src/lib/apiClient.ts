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
    const message = apiError?.message ?? error.message ?? "An error occurred";
    
    // Note: We avoid window.location.href = "/auth" here because it causes 
    // abrupt redirects for background tasks (like pre-fetching).
    // The App.tsx route guards will handle unauthorized states naturally.

    return Promise.reject(new Error(message));
  }
);
