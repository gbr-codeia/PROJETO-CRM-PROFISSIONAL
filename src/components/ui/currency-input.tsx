"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Currency input in BRL. Emits a plain number (2-decimal) via onValueChange.
 * Displays a grouped, comma-decimal string while editing.
 */
export function CurrencyInput({
  value,
  onValueChange,
  className,
  id,
  placeholder = "0,00",
  disabled,
}: {
  value: number;
  onValueChange: (n: number) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [text, setText] = React.useState(() => toText(value));

  React.useEffect(() => {
    // Keep in sync when the value is changed from outside.
    const parsed = fromText(text);
    if (Math.abs(parsed - value) > 0.005) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div
      className={cn(
        "flex h-11 w-full items-center gap-1.5 rounded-xl border border-line bg-surface-input px-3.5 text-sm transition-colors focus-within:border-line-accent focus-within:ring-2 focus-within:ring-primary/25",
        disabled && "opacity-50",
        className,
      )}
    >
      <span className="text-content-subtle">R$</span>
      <input
        id={id}
        inputMode="decimal"
        disabled={disabled}
        className="w-full bg-transparent text-content outline-none placeholder:text-content-subtle"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,]/g, "");
          setText(raw);
          onValueChange(fromText(raw));
        }}
        onBlur={() => setText(toText(fromText(text)))}
      />
    </div>
  );
}

function toText(n: number): string {
  if (!n) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fromText(s: string): number {
  if (!s) return 0;
  // Treat "." as thousands and "," as decimal (pt-BR); tolerate plain "1234.56" too.
  const hasComma = s.includes(",");
  const normalized = hasComma ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
