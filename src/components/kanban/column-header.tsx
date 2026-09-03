"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteColumn, useUpdateColumn } from "@/hooks/queries";
import { CARD_COLORS } from "@/lib/domain";
import { ApiError } from "@/lib/api";
import type { KanbanBoardColumn } from "@/lib/api-types";

export function ColumnHeader({
  column,
  count,
  canDelete,
}: {
  column: KanbanBoardColumn;
  count: number;
  canDelete: boolean;
}) {
  const updateMut = useUpdateColumn();
  const deleteMut = useDeleteColumn();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function saveName() {
    const trimmed = name.trim();
    setEditing(false);
    if (!trimmed || trimmed === column.name) {
      setName(column.name);
      return;
    }
    try {
      await updateMut.mutateAsync({ id: column.id, name: trimmed });
      toast.success("Coluna renomeada.");
    } catch (err) {
      setName(column.name);
      toast.error(err instanceof ApiError ? err.message : "Erro ao renomear.");
    }
  }

  async function setColor(hex: string) {
    try {
      await updateMut.mutateAsync({ id: column.id, color: hex });
    } catch {
      toast.error("Erro ao mudar a cor.");
    }
  }

  async function setDelivered() {
    try {
      await updateMut.mutateAsync({ id: column.id, isDeliveredColumn: true });
      toast.success("Coluna de entrega definida — dispara o financeiro automático.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar.");
    }
  }

  return (
    <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="size-2 shrink-0 rounded-full" style={{ background: column.color ?? "#6a6a6a" }} />
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setEditing(false);
                setName(column.name);
              }
            }}
            className="min-w-0 flex-1 rounded-md bg-surface-input px-1.5 py-0.5 text-sm font-semibold text-content outline-none ring-1 ring-line-accent"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setName(column.name);
              setEditing(true);
            }}
            className="min-w-0 truncate text-left text-sm font-semibold text-content hover:text-primary"
            title="Clique para renomear"
          >
            {column.name}
          </button>
        )}
        {column.isDeliveredColumn && (
          <span className="shrink-0 rounded bg-primary-muted px-1.5 py-0.5 text-[10px] font-medium text-primary">
            auto $
          </span>
        )}
      </div>

      <span className="shrink-0 rounded-md bg-surface-raised px-1.5 py-0.5 text-xs text-content-muted">
        {count}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="shrink-0 rounded-md p-1 text-content-subtle transition-colors hover:bg-surface-raised hover:text-content"
            aria-label="Opções da coluna"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>Renomear</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Cor</DropdownMenuLabel>
          <div className="flex flex-wrap gap-1.5 px-2.5 py-1.5">
            {CARD_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColor(c.hex)}
                aria-label={c.label}
                className={cn(
                  "size-4 rounded-full transition-transform hover:scale-110",
                  column.color === c.hex && "ring-2 ring-content ring-offset-1 ring-offset-surface-overlay",
                )}
                style={{ background: c.hex }}
              />
            ))}
          </div>
          {!column.isDeliveredColumn && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={setDelivered}>Definir como “Entregue”</DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            danger
            disabled={!canDelete}
            onSelect={() => canDelete && setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
            Excluir coluna
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Excluir a coluna “${column.name}”?`}
        description={
          count > 0
            ? "Os projetos desta coluna serão movidos para a primeira coluna do quadro."
            : "A coluna não possui projetos."
        }
        confirmLabel="Excluir coluna"
        danger
        loading={deleteMut.isPending}
        onConfirm={async () => {
          try {
            await deleteMut.mutateAsync({ id: column.id });
            toast.success("Coluna excluída.");
            setConfirmDelete(false);
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Erro ao excluir.");
          }
        }}
      />
    </header>
  );
}
