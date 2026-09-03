"use client";

import { useMemo, useState } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/cn";
import { PROJECT_STATUS } from "@/lib/domain";
import { formatBRL } from "@/lib/format";
import type { Project } from "@/lib/api-types";

const WEEK_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function MiniCalendar({
  month,
  year,
  projects,
  onSelectProject,
}: {
  month: number;
  year: number;
  projects: Project[];
  onSelectProject: (id: string) => void;
}) {
  const monthDate = new Date(year, month - 1, 1);
  const today = new Date();

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const byDay = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of projects) {
      if (!p.deadline) continue;
      const key = format(parseISO(p.deadline), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return map;
  }, [projects]);

  const [selected, setSelected] = useState<string | null>(null);
  const selectedProjects = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div>
      <p className="mb-3 text-sm font-semibold capitalize text-content">
        {format(monthDate, "MMMM yyyy", { locale: ptBR })}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-content-subtle">
        {WEEK_DAYS.map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, monthDate);
          const isToday = isSameDay(day, today);
          const events = byDay.get(key) ?? [];
          const isSelected = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(isSelected ? null : key)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition-colors",
                inMonth ? "text-content" : "text-content-subtle/50",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                    ? "border border-line-accent bg-surface-raised"
                    : "hover:bg-surface-raised",
              )}
            >
              {format(day, "d")}
              {events.length > 0 && !isSelected && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {events.slice(0, 3).map((e, i) => (
                    <span
                      key={i}
                      className="size-1 rounded-full"
                      style={{ background: PROJECT_STATUS[e.status].hex }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 space-y-1.5 border-t border-line pt-3">
          {selectedProjects.length === 0 ? (
            <p className="text-xs text-content-muted">Nenhuma entrega neste dia.</p>
          ) : (
            selectedProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProject(p.id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface-raised px-2.5 py-2 text-left transition-colors hover:border-line-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-content">{p.title}</span>
                  <span className="block truncate text-[11px] text-content-muted">
                    {p.client?.name}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-medium text-content-muted">
                  {formatBRL(p.value)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
