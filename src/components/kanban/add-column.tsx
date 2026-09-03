"use client";

import { useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCreateColumn } from "@/hooks/queries";
import { ApiError } from "@/lib/api";

export function AddColumn() {
  const createMut = useCreateColumn();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await createMut.mutateAsync({ name: trimmed });
      setName("");
      toast.success("Coluna criada.");
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao criar coluna.");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="flex h-full w-[52px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-content-subtle transition-colors hover:border-line-accent hover:text-content"
        title="Adicionar coluna"
      >
        <Plus className="size-5" />
        <span className="[writing-mode:vertical-rl] text-xs font-medium">Nova coluna</span>
      </button>
    );
  }

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col gap-2 rounded-2xl border border-line-accent bg-surface p-3">
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
          }
        }}
        placeholder="Nome da coluna…"
        className="w-full rounded-lg bg-surface-input px-2.5 py-2 text-sm text-content outline-none ring-1 ring-line focus:ring-line-accent"
      />
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={submit} loading={createMut.isPending} disabled={!name.trim()}>
          <Check className="size-4" />
          Adicionar
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setName("");
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
