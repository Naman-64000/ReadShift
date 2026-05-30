/**
 * client/src/App.tsx
 */
import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import Toast from "@/components/shared/Toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useUIStore, useUserStore } from "@/store";

// Screens
import OnboardingScreen from "@/screens/OnboardingScreen";
import CalibrationScreen from "@/screens/CalibrationScreen";
import SessionConfigScreen from "@/screens/SessionConfigScreen";
import ReadingScreen from "@/screens/ReadingScreen";
import MCQScreen from "@/screens/MCQScreen";
import ResultsScreen from "@/screens/ResultsScreen";
import DashboardScreen from "@/screens/DashboardScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import AdminScreen from "@/screens/AdminScreen";
import AuthScreen from "@/screens/AuthScreen";
import MetronomeDrillScreen from "@/screens/MetronomeDrillScreen";

export default function App() {
  const isFullscreen = useUIStore((s) => s.isFullscreen);
  const fetchProfile = useUserStore((s) => s.fetchProfile);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for mock dev session first
    const mockUser = localStorage.getItem("readshift_dev_user");
    if (mockUser) {
      setSession({ user: JSON.parse(mockUser), access_token: "dev-token" });
      setLoading(false);
      return;
    }

    // 2. Otherwise check Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // If we are in mock dev mode, ignore Supabase auth changes
      if (localStorage.getItem("readshift_dev_user")) return;

      const user = session?.user ?? null;
      
      // Strict production check: require email confirmation
      if (user && !user.email_confirmed_at && import.meta.env.VITE_DEV_MODE !== "true") {
        setSession(null);
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      void fetchProfile();
    }
  }, [session, fetchProfile]);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {!isFullscreen && session && <Navbar />}

      <Routes>
        {/* Public */}
        <Route path="/auth" element={!session ? <AuthScreen /> : <Navigate to="/dashboard" />} />
        
        {/* Protected */}
        <Route path="/dashboard"       element={session ? <DashboardScreen /> : <Navigate to="/auth" />} />
        <Route path="/onboarding"      element={session ? <OnboardingScreen /> : <Navigate to="/auth" />} />
        <Route path="/calibration"     element={session ? <CalibrationScreen /> : <Navigate to="/auth" />} />
        <Route path="/session/config"  element={session ? <SessionConfigScreen /> : <Navigate to="/auth" />} />
        <Route path="/session/reading" element={session ? <ReadingScreen /> : <Navigate to="/auth" />} />
        <Route path="/session/mcq"     element={session ? <MCQScreen /> : <Navigate to="/auth" />} />
        <Route path="/session/results" element={session ? <ResultsScreen /> : <Navigate to="/auth" />} />
        <Route path="/settings"        element={session ? <SettingsScreen /> : <Navigate to="/auth" />} />
        <Route path="/admin"           element={session ? <AdminScreen /> : <Navigate to="/auth" />} />
        <Route path="/drills/metronome" element={session ? <MetronomeDrillScreen /> : <Navigate to="/auth" />} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <Toast />
    </div>
  );
}
