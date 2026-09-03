"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) {
    return total !== undefined ? (
      <p className="pt-2 text-xs text-content-subtle">{total} registro(s)</p>
    ) : null;
  }
  return (
    <div className="flex items-center justify-between pt-3">
      <p className="text-xs text-content-subtle">
        Página {page} de {totalPages}
        {total !== undefined ? ` · ${total} registro(s)` : ""}
      </p>
      <div className="flex gap-1.5">
        <Button
          variant="secondary"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
