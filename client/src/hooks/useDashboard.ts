import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useDashboardStore } from "@/store";

export function useDashboard(options: { autoFetch?: boolean } = {}) {
  const { autoFetch = true } = options;
  const { summary, isLoading, error, fetchSummary, invalidate } = useDashboardStore();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (autoFetch && session) {
        fetchSummary();
      }
    };
    checkAuth();
  }, [autoFetch, fetchSummary]);

  const refresh = () => fetchSummary(true);

  return { summary, isLoading, error, refresh, invalidate };
}
