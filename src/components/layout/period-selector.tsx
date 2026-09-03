"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePeriod } from "@/components/period-context";
import { monthName } from "@/lib/format";

const MONTHS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function PeriodSelector({ compact = false }: { compact?: boolean }) {
  const { period, setPeriod, next, prev, reset, isCurrent } = usePeriod();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(period.year);

  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
      <Button variant="ghost" size="icon-sm" onClick={prev} aria-label="Mês anterior">
        <ChevronLeft className="size-4" />
      </Button>

      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setViewYear(period.year);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-content transition-colors hover:bg-surface-raised",
              compact && "px-2",
            )}
          >
            <CalendarDays className="size-4 text-primary" />
            <span className="tabular-nums">
              {compact ? `${MONTHS_SHORT[period.month - 1]} ${period.year}` : `${monthName(period.month)} de ${period.year}`}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <div className="mb-3 flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" onClick={() => setViewYear((y) => y - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-semibold tabular-nums text-content">{viewYear}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setViewYear((y) => y + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS_SHORT.map((label, idx) => {
              const active = period.month === idx + 1 && period.year === viewYear;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setPeriod({ month: idx + 1, year: viewYear });
                    setOpen(false);
                  }}
                  className={cn(
                    "rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-content-muted hover:bg-surface-raised hover:text-content",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              reset();
              setOpen(false);
            }}
            disabled={isCurrent}
            className="mt-3 w-full rounded-lg border border-line py-2 text-xs font-medium text-content-muted transition-colors hover:border-line-accent hover:text-content disabled:opacity-40"
          >
            Mês atual
          </button>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon-sm" onClick={next} aria-label="Próximo mês">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
