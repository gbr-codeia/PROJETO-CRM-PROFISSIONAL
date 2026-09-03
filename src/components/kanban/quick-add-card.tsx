"use client";

import { useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CARD_COLORS } from "@/lib/domain";

export function QuickAddCard({
  onCreate,
  pending = false,
}: {
  onCreate: (data: { title: string; value: number; color?: string }) => Promise<void> | void;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState(0);
  const [color, setColor] = useState<string | undefined>();
  const titleRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle("");
    setValue(0);
    setColor(undefined);
  }

  async function submit() {
    if (title.trim().length < 2 || pending) return;
    await onCreate({ title: title.trim(), value, color });
    reset();
    // keep the composer open for rapid entry
    requestAnimationFrame(() => titleRef.current?.focus());
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => titleRef.current?.focus());
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-xs font-medium text-content-subtle transition-colors hover:border-line-accent hover:text-content"
      >
        <Plus className="size-3.5" />
        Adicionar item
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-line-accent bg-surface-raised p-2.5">
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setOpen(false);
            reset();
          }
        }}
        placeholder="Nome do item…"
        className="w-full bg-transparent text-sm text-content outline-none placeholder:text-content-subtle"
      />

      <div className="mt-2.5 flex items-center gap-1.5">
        {CARD_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            onClick={() => setColor((cur) => (cur === c.hex ? undefined : c.hex))}
            title={c.label}
            aria-label={`Cor ${c.label}`}
            className={cn(
              "size-4 rounded-full transition-transform",
              color === c.hex
                ? "scale-110 ring-2 ring-content ring-offset-2 ring-offset-surface-raised"
                : "hover:scale-110",
            )}
            style={{ background: c.hex }}
          />
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex-1">
          <CurrencyInput value={value} onValueChange={setValue} className="h-9" />
        </div>
        <Button size="icon-sm" onClick={submit} loading={pending} disabled={title.trim().length < 2}>
          <Check className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
