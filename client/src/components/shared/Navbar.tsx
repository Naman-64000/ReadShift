/**
 * client/src/components/shared/Navbar.tsx
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useUserStore, useUIStore } from "@/store";

export default function Navbar() {
  const { pathname } = useLocation();
  const user = useUserStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const isAdmin = !!user?.is_admin;
  const [isOpen, setIsOpen] = useState(false);


  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/session/config", label: "Start Session" },
    { to: "/drills/metronome", label: "Drills" },
    { to: "/settings", label: "Settings" },
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  // Close menu on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close menu on screen resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSignOut = async () => {
    localStorage.removeItem("readshift_dev_user");
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[rgb(var(--surface))]/90 backdrop-blur-xl border-b border-[rgb(var(--border))]/20">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-black">
            <span className="text-[rgb(var(--text))]">Read</span>
            <span className="text-indigo-400">Shift</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map(({ to, label }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  active ? "text-indigo-400" : "text-slate-400 hover:text-[rgb(var(--text))]"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-lg bg-indigo-500/10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Theme & Sign Out */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Theme toggle — icon is always visible because we use currentColor which adapts */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:text-[rgb(var(--text))] hover:bg-indigo-500/8 transition-all focus:outline-none"
            aria-label="Toggle theme"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? (
              /* Moon icon — visible in light mode because text-slate-500 is a visible grey */
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              /* Sun icon — visible in dark mode */
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            )}
          </button>
          <button
            onClick={handleSignOut}
            className="h-8 px-3 text-sm font-semibold rounded-xl transition-all
              text-rose-400 hover:text-rose-300 hover:bg-rose-500/10
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            Sign Out
          </button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex sm:hidden items-center justify-center p-2 rounded-lg text-slate-400 hover:text-[rgb(var(--text))] hover:bg-indigo-500/8 transition-colors focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Animated Drop-down Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="sm:hidden absolute top-16 inset-x-0 bg-[rgb(var(--surface))] backdrop-blur-xl border-b border-[rgb(var(--border))]/20 overflow-hidden shadow-2xl"
          >
            <div className="flex flex-col px-4 py-4 gap-2">
              {navLinks.map(({ to, label }) => {
                const active = pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "flex items-center px-4 py-3 rounded-lg text-base font-semibold transition-colors",
                      active ? "text-indigo-400 bg-indigo-500/8" : "text-slate-400 hover:text-[rgb(var(--text))] hover:bg-indigo-500/5"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
              <hr className="my-2 border-[rgb(var(--border))]/20" />
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm font-semibold text-slate-400">Theme</span>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgb(var(--border))]/30 bg-indigo-500/5 text-sm font-bold text-slate-400 hover:text-[rgb(var(--text))] transition-colors"
                >
                  {theme === "light" ? (
                    <>🌙 Dark Mode</>
                  ) : (
                    <>☀️ Light Mode</>
                  )}
                </button>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center px-4 py-3 rounded-lg text-base font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors w-full text-left"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
