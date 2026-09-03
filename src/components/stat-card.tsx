"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";

interface StatCardProps {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  changePct?: number | null;
  hint?: string;
  accent?: boolean;
  index?: number;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  changePct,
  hint,
  accent = false,
  index = 0,
}: StatCardProps) {
  const hasChange = changePct !== null && changePct !== undefined && Number.isFinite(changePct);
  const up = hasChange && (changePct as number) > 0;
  const down = hasChange && (changePct as number) < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-surface p-4 shadow-card transition-all sm:p-5",
        accent ? "border-line-accent" : "border-line hover:border-line-accent",
      )}
    >
      {accent && (
        <div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-primary/10 blur-2xl" />
      )}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-content-muted">{label}</span>
        {Icon && (
          <span
            className={cn(
              "rounded-lg border p-1.5",
              accent
                ? "border-primary/30 bg-primary-muted text-primary"
                : "border-line bg-surface-raised text-content-subtle",
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>

      <div className="mt-3 text-2xl font-semibold tracking-tight text-content sm:text-[26px]">
        {value}
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs">
        {hasChange ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium",
              up && "bg-success/10 text-success",
              down && "bg-danger/10 text-danger",
              !up && !down && "bg-surface-raised text-content-muted",
            )}
          >
            {up ? <ArrowUpRight className="size-3" /> : down ? <ArrowDownRight className="size-3" /> : <Minus className="size-3" />}
            {formatPercent(changePct)}
          </span>
        ) : null}
        <span className="text-content-subtle">{hint ?? "vs. mês anterior"}</span>
      </div>
    </motion.div>
  );
}
