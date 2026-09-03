import * as React from "react";
import { cn } from "@/lib/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[90px] w-full rounded-xl border border-line bg-surface-input px-3.5 py-2.5 text-sm text-content transition-colors",
      "placeholder:text-content-subtle resize-y",
      "focus-visible:outline-none focus-visible:border-line-accent focus-visible:ring-2 focus-visible:ring-primary/25",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
