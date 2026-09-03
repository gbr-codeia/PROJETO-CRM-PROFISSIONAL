import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-line bg-surface-input px-3.5 text-sm text-content transition-colors",
        "placeholder:text-content-subtle",
        "focus-visible:outline-none focus-visible:border-line-accent focus-visible:ring-2 focus-visible:ring-primary/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-content",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
