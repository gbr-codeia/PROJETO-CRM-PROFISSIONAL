"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Bell, CircleAlert, Clock } from "lucide-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjects } from "@/hooks/queries";
import { formatDateShort } from "@/lib/format";

export function Notifications() {
  const router = useRouter();
  const { data } = useProjects({ pageSize: 100, sortBy: "deadline", sortDir: "asc" });

  const items = useMemo(() => {
    const projects = data?.data ?? [];
    const now = new Date();
    return projects
      .filter(
        (p) =>
          p.deadline &&
          p.status !== "DELIVERED" &&
          p.status !== "CANCELLED",
      )
      .map((p) => ({
        id: p.id,
        title: p.title,
        client: p.client?.name ?? "—",
        deadline: p.deadline as string,
        days: differenceInCalendarDays(parseISO(p.deadline as string), now),
      }))
      .filter((p) => p.days <= 7)
      .sort((a, b) => a.days - b.days)
      .slice(0, 8);
  }, [data]);

  const overdue = items.filter((i) => i.days < 0).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative grid size-10 place-items-center rounded-xl border border-line bg-surface text-content-muted transition-colors hover:border-line-accent hover:text-content"
          aria-label="Notificações"
        >
          <Bell className="size-[18px]" />
          {items.length > 0 && (
            <span
              className={cn(
                "absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-semibold",
                overdue > 0 ? "bg-danger text-white" : "bg-primary text-primary-foreground",
              )}
            >
              {items.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Prazos próximos</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-sm text-content-muted">
            Nenhum prazo nos próximos 7 dias.
          </p>
        ) : (
          <div className="max-h-80 space-y-0.5 overflow-y-auto scrollbar-thin">
            {items.map((i) => {
              const late = i.days < 0;
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => router.push(`/projetos?open=${i.id}`)}
                  className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-raised"
                >
                  <span
                    className={cn(
                      "mt-0.5 rounded-md p-1",
                      late ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning",
                    )}
                  >
                    {late ? <CircleAlert className="size-3.5" /> : <Clock className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-content">{i.title}</span>
                    <span className="block truncate text-xs text-content-muted">
                      {i.client} · {formatDateShort(i.deadline)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium",
                      late ? "text-danger" : "text-content-subtle",
                    )}
                  >
                    {late
                      ? `${Math.abs(i.days)}d atraso`
                      : i.days === 0
                        ? "hoje"
                        : `${i.days}d`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
