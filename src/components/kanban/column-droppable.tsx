"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/cn";

export function ColumnDroppable({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "column" } });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 space-y-2 rounded-xl p-1 transition-colors",
        isOver && "bg-primary/10",
        className,
      )}
    >
      {children}
    </div>
  );
}
