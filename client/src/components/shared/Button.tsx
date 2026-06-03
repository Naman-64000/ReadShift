/**
 * client/src/components/shared/Button.tsx
 */

import { motion } from "framer-motion";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const variants = {
  primary:   "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25",
  secondary: "bg-[rgb(var(--surface-2))] hover:bg-[rgb(var(--surface))] text-[rgb(var(--text))] border border-[rgb(var(--border))]",
  ghost:     "bg-transparent hover:bg-[rgb(var(--surface-2))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]",
  danger:    "bg-red-600/90 hover:bg-red-500 text-white shadow-lg shadow-red-600/25",
};

const sizes = {
  sm: "h-8  px-3  text-sm  gap-1.5",
  md: "h-10 px-5  text-sm  gap-2",
  lg: "h-12 px-7  text-base gap-2.5",
};

export default function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...(props as object)}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </motion.button>
  );
}
