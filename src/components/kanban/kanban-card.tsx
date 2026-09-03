"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, Check, GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import { PaymentBadge, PriorityBadge } from "@/components/badges";
import { formatBRL, formatDateShort } from "@/lib/format";
import type { KanbanBoardColumn } from "@/lib/api-types";

export type BoardCard = KanbanBoardColumn["cards"][number];

export function KanbanCard({
  card,
  onOpen,
  onComplete,
  overlay = false,
}: {
  card: BoardCard;
  onOpen?: (id: string) => void;
  onComplete?: (id: string) => void;
  overlay?: boolean;
}) {
  const sortable = useSortable({ id: card.projectId, data: { type: "card", card } });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const late =
    card.deadline &&
    card.status !== "DELIVERED" &&
    new Date(card.deadline).getTime() < Date.now();

  const done = card.status === "DELIVERED";

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-line bg-surface-raised p-3 transition-colors",
        isDragging && !overlay && "opacity-40",
        overlay && "shadow-glow rotate-1 cursor-grabbing",
        !overlay && "hover:border-line-accent",
      )}
    >
      {card.color && (
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: card.color }}
          aria-hidden
        />
      )}

      <div className={cn("flex items-start gap-2", card.color && "pl-1.5")}>
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab text-content-subtle/60 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Arrastar"
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onOpen?.(card.projectId)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="line-clamp-2 text-sm font-medium text-content">{card.title}</p>
          <p className="mt-0.5 truncate text-xs text-content-muted">{card.client?.name ?? "—"}</p>
        </button>

        {!overlay && !done && onComplete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(card.projectId);
            }}
            title="Concluir → Entregue"
            aria-label="Concluir projeto"
            className="shrink-0 rounded-lg border border-primary/30 bg-primary-muted p-1 text-primary opacity-0 transition-all hover:bg-primary hover:text-primary-foreground group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Check className="size-3.5" />
          </button>
        )}
      </div>

      <div className={cn("mt-2.5 flex items-center justify-between gap-2", card.color && "pl-1.5")}>
        <span className="text-sm font-semibold tabular-nums text-content">{formatBRL(card.value)}</span>
        <PaymentBadge status={card.paymentStatus} />
      </div>

      <div className={cn("mt-2 flex items-center justify-between gap-2", card.color && "pl-1.5")}>
        <PriorityBadge priority={card.priority} />
        {card.deadline && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              late ? "text-danger" : "text-content-subtle",
            )}
          >
            <CalendarClock className="size-3" />
            {formatDateShort(card.deadline)}
          </span>
        )}
      </div>
    </div>
  );
}
