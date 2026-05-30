/**
 * client/src/screens/AuthScreen.tsx
 */
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/shared/Button";
import { useUIStore } from "@/store";
import { motion } from "framer-motion";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      addToast({ message: error.message, type: "error" });
    } else if (isSignUp) {
      addToast({ message: "Check your email for confirmation!", type: "success" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-950">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 p-8 rounded-2xl border border-white/10 bg-white/4"
      >
        <div className="text-center">
          <h1 className="text-3xl font-black text-white">Read<span className="text-indigo-400">Shift</span></h1>
          <p className="text-slate-400 text-sm mt-2">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full border border-white/10 bg-white/5"
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4 mr-2" alt="Google" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-950 px-2 text-slate-500 text-[10px] font-bold">Or use email</span></div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <Button size="lg" className="w-full" isLoading={loading}>
            {isSignUp ? "Sign Up" : "Sign In"}
          </Button>

          {import.meta.env.VITE_DEV_MODE === "true" && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-950 px-2 text-slate-500">Or</span></div>
              </div>

              <Button 
                type="button"
                variant="secondary" 
                className="w-full" 
                onClick={() => {
                  const mockUser = { id: "dev-user-123", email: "dev@readshift.local" };
                  localStorage.setItem("readshift_dev_user", JSON.stringify(mockUser));
                  window.location.reload();
                }}
              >
                Skip Auth (Dev Mode)
              </Button>
            </>
          )}
        </form>

        <p className="text-center text-sm text-slate-500">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-indigo-400 hover:underline font-medium"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
