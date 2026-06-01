/**
 * client/src/screens/AuthScreen.tsx
 */
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/shared/Button";
import { useUIStore } from "@/store";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/apiClient";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const isPasswordValid = password.length >= 8;

  // Background poller: Automatically logs the user in on desktop once they confirm on mobile
  useEffect(() => {
    if (!waitingForConfirmation) return;

    const interval = setInterval(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (!error && data?.session) {
        clearInterval(interval);
        addToast({ message: "Email confirmed! Logging you in...", type: "success" });
        // Clean, hard redirect to ensure fresh local storage session load
        window.location.href = "/dashboard";
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [waitingForConfirmation, email, password, addToast]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp && !isPasswordValid) {
      addToast({ message: "Password must be at least 8 characters long.", type: "error" });
      setLoading(false);
      return;
    }

    // Unregistered check (only for Sign In mode)
    if (!isSignUp) {
      try {
        const checkRes = await apiClient.get(`/users/exists?email=${encodeURIComponent(email)}`);
        if (!checkRes.data?.data?.exists) {
          addToast({ message: "This email address is not registered.", type: "error" });
          setLoading(false);
          return;
        }
      } catch (err) {
        // Fallback to normal Supabase check if local DB check has issues
      }
    }
    
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` }
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (!isSignUp) {
        // If login failed, and we verified the email exists in DB, it is either unconfirmed or incorrect password
        const msg = error.message.toLowerCase();
        if (msg.includes("confirm") || msg.includes("verify") || msg.includes("confirmed")) {
          addToast({ message: error.message, type: "error" });
        } else {
          addToast({ message: "Incorrect password. Please try again.", type: "error" });
        }
      } else {
        addToast({ message: error.message, type: "error" });
      }
    } else if (isSignUp) {
      addToast({ message: "Check your email for confirmation!", type: "success" });
      setWaitingForConfirmation(true);
    }
    setLoading(false);
  };

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setWaitingForConfirmation(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-950 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Side: Brand & Feature Pitching (Only shows on md+ screen, dynamically updates based on state) */}
        <div className="hidden md:flex md:col-span-5 flex-col justify-center space-y-6 pr-4">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-2"
          >
            <h1 className="text-4xl font-black text-white tracking-tight">
              Read<span className="text-indigo-400">Shift</span>
            </h1>
            <p className="text-indigo-200/60 font-semibold tracking-wide text-sm uppercase">
              {isSignUp ? "Cognitive Acceleration Hub" : "Welcome Back, Reader"}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {waitingForConfirmation ? (
              <motion.div
                key="waiting-pitch"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-white leading-snug">
                  Waiting for verification...
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We've initialized your reader profile. As soon as you tap the verification button in the email we sent, this desktop page will instantly transition to your training portal.
                </p>
                <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-950/20 space-y-2 flex items-center space-x-3">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full animate-ping shrink-0" />
                  <div className="text-xs text-indigo-300">Live synchronizing across devices...</div>
                </div>
              </motion.div>
            ) : isSignUp ? (
              <motion.div
                key="signup-benefits"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-white leading-snug">
                  Unlock systematic speed improvements at GMAT/CAT rigour.
                </h2>
                <div className="space-y-4">
                  {[
                    { title: "Rigorous Curated Passages", desc: "Scientific, abstract, and business passages balanced at academic standards." },
                    { title: "Paragraph Role Mapping", desc: "Train your brain to recognize paragraph functions, not just memorize text." },
                    { title: "Dynamic Pacing Engine", desc: "Interactive highlight guides with adaptive metronome speed modes." }
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                      <div className="mt-1 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">✓</div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">{feat.title}</h4>
                        <p className="text-xs text-slate-400 leading-normal">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="signin-welcome"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-white leading-snug">
                  Ready to resume your cognitive workouts?
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Consistency builds lasting cognitive pathways. Log back in to resume your daily streak, challenge your baseline speed, and analyze your growth performance.
                </p>
                <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-2">
                  <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Today's Focus</div>
                  <div className="text-xs text-slate-300">Maintain an accurate comprehension rate of &gt;80% on highly-dense abstract passages.</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Auth Card */}
        <div className="md:col-span-7 w-full max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {waitingForConfirmation ? (
              <motion.div
                key="waiting-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full p-8 rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-slate-900/40 shadow-[0_0_50px_rgba(99,102,241,0.08)] text-center space-y-6"
              >
                <div className="space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center relative">
                    <div className="absolute w-12 h-12 rounded-full border border-indigo-500/40 animate-ping" />
                    <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight pt-2">Check Your Email</h3>
                  <p className="text-xs text-slate-400 leading-relaxed px-4 mb-2">
                    We sent a secure verification link to <span className="text-indigo-300 font-bold">{email}</span>.
                  </p>
                  <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mx-4 text-left space-y-1.5 leading-normal font-medium">
                    <span className="font-bold text-amber-400 block">⚠️ Crucial Inbox Instructions:</span>
                    <span className="block">1. If you don't see the email, check your <span className="font-bold underline">Spam / Junk folder</span>.</span>
                    <span className="block">2. You <span className="font-bold">MUST click "Report not spam"</span> or move it to your Inbox (otherwise Gmail completely disables the button).</span>
                    <span className="block">3. Once in your Inbox, click the <span className="font-bold">Verify My Email</span> button.</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-3">
                  <div className="flex items-center justify-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                    <span>Synchronizing...</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    This screen will automatically redirect to your dashboard the moment your email is verified. You don't need to refresh.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setWaitingForConfirmation(false)}
                  className="text-xs text-slate-400 hover:text-white transition-colors underline font-medium"
                >
                  Back to sign in / edit email
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="auth-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
                className={`w-full p-8 rounded-2xl border transition-all duration-300 ${
                  isSignUp 
                    ? "border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-slate-900/40 shadow-[0_0_50px_rgba(99,102,241,0.08)]" 
                    : "border-white/10 bg-white/4"
                }`}
              >
                <div className="text-center md:text-left mb-6">
                  {/* Mobile-only logo */}
                  <h1 className="text-2xl font-black text-white md:hidden mb-2">Read<span className="text-indigo-400">Shift</span></h1>
                  
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    {isSignUp ? "Create Account" : "Welcome Back"}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    {isSignUp ? "Join a network of high-performance analytical readers." : "Access your ReadShift learning portal."}
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-colors"
                      placeholder="••••••••"
                    />
                    
                    {/* Visual Password validation helper for Sign Up */}
                    {isSignUp && (
                      <div className="pt-1.5 flex items-center space-x-1.5">
                        <div className={`w-2 h-2 rounded-full transition-colors duration-200 ${isPasswordValid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className={`text-[11px] transition-colors duration-200 ${isPasswordValid ? 'text-emerald-400 font-bold' : 'text-rose-400'}`}>
                          {isPasswordValid ? "✓ Strong Password" : "Password must be at least 8 characters"}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button size="lg" className="w-full mt-4 font-bold" isLoading={loading}>
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

                <p className="text-center text-xs text-slate-500 mt-6 font-medium">
                  {isSignUp ? "Already have an account?" : "New to ReadShift?"}{" "}
                  <button 
                    onClick={handleToggleMode}
                    className="text-indigo-400 hover:underline font-bold transition-all ml-0.5"
                  >
                    {isSignUp ? "Sign In" : "Register Now"}
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
