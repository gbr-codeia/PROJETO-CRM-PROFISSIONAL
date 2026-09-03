import { cn } from "@/lib/cn";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative grid size-8 place-items-center rounded-xl border border-primary/30 bg-primary-muted shadow-glow-sm">
        <svg viewBox="0 0 24 24" className="size-4 text-primary" fill="none" aria-hidden>
          <path
            d="M8 5v14l11-7L8 5Z"
            fill="currentColor"
            fillOpacity="0.9"
          />
        </svg>
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-content">
          EDIT<span className="text-primary">FLOW</span>
        </span>
      )}
    </span>
  );
}
