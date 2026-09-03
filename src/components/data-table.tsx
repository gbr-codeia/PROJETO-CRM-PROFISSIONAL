"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface Column<Row> {
  key: string;
  header: React.ReactNode;
  cell: (row: Row) => React.ReactNode;
  className?: string;
  headClassName?: string;
  /** Used as the card title on mobile. */
  primary?: boolean;
  /** Label shown before the value on mobile. */
  mobileLabel?: string;
  /** Hide this column on the mobile card. */
  hideOnMobile?: boolean;
  align?: "left" | "right" | "center";
}

interface DataTableProps<Row> {
  data: Row[];
  columns: Column<Row>[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  className?: string;
  dense?: boolean;
}

export function DataTable<Row>({
  data,
  columns,
  rowKey,
  onRowClick,
  className,
  dense = false,
}: DataTableProps<Row>) {
  const alignCls = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-line md:block scrollbar-thin">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-raised/50">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-3 text-xs font-medium uppercase tracking-wide text-content-subtle",
                    alignCls(c.align),
                    c.headClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-line/60 last:border-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-surface-raised/60",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 align-middle text-content",
                      dense ? "py-2.5" : "py-3.5",
                      alignCls(c.align),
                      c.className,
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {data.map((row) => {
          const primary = columns.find((c) => c.primary);
          const rest = columns.filter((c) => !c.primary && !c.hideOnMobile);
          return (
            <button
              key={rowKey(row)}
              type="button"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "block w-full rounded-2xl border border-line bg-surface p-4 text-left transition-colors",
                onRowClick && "active:border-line-accent",
              )}
            >
              {primary && (
                <div className="mb-2 text-sm font-semibold text-content">{primary.cell(row)}</div>
              )}
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                {rest.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-content-subtle">
                      {c.mobileLabel ?? (typeof c.header === "string" ? c.header : c.key)}
                    </dt>
                    <dd className="truncate text-sm text-content">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </button>
          );
        })}
      </div>
    </div>
  );
}
