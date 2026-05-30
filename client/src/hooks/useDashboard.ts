import { useEffect } from "react";
import { useDashboardStore } from "@/store";

export function useDashboard(options: { autoFetch?: boolean } = {}) {
  const { autoFetch = true } = options;
  const { summary, isLoading, error, fetchSummary, invalidate } = useDashboardStore();

  useEffect(() => {
    if (autoFetch) {
      fetchSummary();
    }
  }, [autoFetch, fetchSummary]);

  const refresh = () => fetchSummary(true);

  return { summary, isLoading, error, refresh, invalidate };
}
