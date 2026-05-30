import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/store";

export function useUserProfile() {
  const { user, preferences, isLoading, error, fetchProfile, clearUser } = useUserStore();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (!user && !isLoading) fetchProfile();
      } else {
        clearUser();
      }
    };
    checkAuth();
  }, [user, isLoading, fetchProfile, clearUser]);

  const isOnboardingComplete = !!user && !!preferences;

  return { user, preferences, isLoading, error, isOnboardingComplete };
}
