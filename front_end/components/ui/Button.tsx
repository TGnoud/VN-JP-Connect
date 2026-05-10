"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer",
        {
          // Variants
          "bg-slate-900 text-white hover:bg-slate-700 focus:ring-slate-900 disabled:bg-slate-300":
            variant === "primary",
          "border border-slate-900 text-slate-900 bg-white hover:bg-slate-50 focus:ring-slate-900 disabled:border-slate-300 disabled:text-slate-300":
            variant === "outline",
          "text-slate-700 hover:bg-slate-100 focus:ring-slate-400 disabled:text-slate-300":
            variant === "ghost",
          "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600 disabled:bg-rose-300":
            variant === "danger",
          // Sizes
          "text-sm px-4 py-2 gap-1.5": size === "sm",
          "text-sm px-5 py-2.5 gap-2": size === "md",
          "text-base px-6 py-3 gap-2": size === "lg",
          // Full width
          "w-full": fullWidth,
          // Disabled
          "disabled:cursor-not-allowed": true,
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
