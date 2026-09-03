"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState } from "@/components/states";
import {
  useColumns,
  useCreateColumn,
  useDeleteColumn,
  useReorderColumns,
  useUpdateColumn,
} from "@/hooks/queries";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { KanbanColumn } from "@/lib/api-types";

const COLORS = ["#64748b", "#f59e0b", "#3b82f6", "#a855f7", "#ef4444", "#1ED9B6", "#ec4899"];

export function ColumnsManager() {
  const { data: columns, isLoading } = useColumns();
  const createMut = useCreateColumn();
  const updateMut = useUpdateColumn();
  const deleteMut = useDeleteColumn();
  const reorderMut = useReorderColumns();

  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [toDelete, setToDelete] = useState<KanbanColumn | null>(null);

  const list = columns ?? [];

  async function handleCreate() {
    if (newName.trim().length < 1) return;
    try {
      await createMut.mutateAsync({ name: newName.trim() });
      setNewName("");
      toast.success("Coluna criada.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao criar coluna.");
    }
  }

  async function saveEdit(id: string) {
    try {
      await updateMut.mutateAsync({ id, name: editName.trim() });
      setEditing(null);
      toast.success("Coluna atualizada.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar.");
    }
  }

  async function setColor(id: string, color: string) {
    try {
      await updateMut.mutateAsync({ id, color });
    } catch {
      toast.error("Erro ao mudar a cor.");
    }
  }

  async function setDelivered(id: string) {
    try {
      await updateMut.mutateAsync({ id, isDeliveredColumn: true });
      toast.success("Coluna de entrega definida — dispara o financeiro automático.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar.");
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await reorderMut.mutateAsync(next.map((c) => c.id));
    } catch {
      toast.error("Erro ao reordenar.");
    }
  }

  if (isLoading) return <LoadingState rows={4} />;

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {list.map((col, i) => (
          <li
            key={col.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-raised p-3"
          >
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0 || reorderMut.isPending}
                className="text-content-subtle hover:text-content disabled:opacity-30"
                aria-label="Mover para cima"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === list.length - 1 || reorderMut.isPending}
                className="text-content-subtle hover:text-content disabled:opacity-30"
                aria-label="Mover para baixo"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(col.id, c)}
                  className={cn(
                    "size-4 rounded-full border transition-transform",
                    col.color === c ? "scale-110 border-content" : "border-transparent",
                  )}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>

            {editing === col.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 flex-1"
                  autoFocus
                />
                <Button size="icon-sm" onClick={() => saveEdit(col.id)} loading={updateMut.isPending}>
                  <Check className="size-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => setEditing(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditing(col.id);
                  setEditName(col.name);
                }}
                className="flex-1 text-left text-sm font-medium text-content hover:text-primary"
              >
                {col.name}
              </button>
            )}

            <span className="text-xs text-content-subtle">{col.cardsCount ?? 0} proj.</span>

            {col.isDeliveredColumn ? (
              <Badge variant="primary">Entrega · auto $</Badge>
            ) : (
              <button
                type="button"
                onClick={() => setDelivered(col.id)}
                className="rounded-md border border-line px-2 py-1 text-xs text-content-muted hover:border-line-accent"
              >
                Definir como entrega
              </button>
            )}

            <button
              type="button"
              onClick={() => setToDelete(col)}
              disabled={list.length <= 1}
              className="rounded-md p-1 text-content-subtle hover:bg-danger/10 hover:text-danger disabled:opacity-30"
              aria-label="Excluir coluna"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Nova coluna…"
          className="h-10"
        />
        <Button onClick={handleCreate} loading={createMut.isPending} disabled={!newName.trim()}>
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Excluir a coluna “${toDelete?.name}”?`}
        description={
          (toDelete?.cardsCount ?? 0) > 0
            ? "Os projetos desta coluna serão movidos para a primeira coluna do quadro."
            : "A coluna não possui projetos."
        }
        confirmLabel="Excluir coluna"
        danger
        loading={deleteMut.isPending}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteMut.mutateAsync({ id: toDelete.id });
            toast.success("Coluna excluída.");
            setToDelete(null);
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Erro ao excluir.");
          }
        }}
      />
    </div>
  );
}
