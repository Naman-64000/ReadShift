/**
 * client/src/components/shared/Toast.tsx
 * Toast notification system driven by useUIStore.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useUIStore, type Toast } from "@/store/uiSlice";
import { cn } from "@/lib/utils";

const icons: Record<Toast["type"], string> = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
  warning: "⚠",
};

const colours: Record<Toast["type"], string> = {
  success: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  error:   "border-red-500/50     bg-red-500/10     text-red-300",
  info:    "border-indigo-500/50  bg-indigo-500/10  text-indigo-300",
  warning: "border-amber-500/50   bg-amber-500/10   text-amber-300",
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useUIStore();

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, removeToast]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md",
        "text-sm font-medium max-w-sm w-full cursor-pointer select-none",
        colours[toast.type]
      )}
      onClick={() => removeToast(toast.id)}
    >
      <span className="text-base font-bold shrink-0">{icons[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>
    </motion.div>
  );
}

export default function Toast() {
  const { toasts } = useUIStore();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
