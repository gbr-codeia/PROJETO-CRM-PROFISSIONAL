"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/cn";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  centerValue,
  centerLabel,
  size = 200,
  formatValue = (n) => String(n),
}: {
  data: DonutSlice[];
  centerValue: string;
  centerLabel: string;
  size?: number;
  formatValue?: (n: number) => string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const hasData = total > 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={hasData ? data : [{ name: "vazio", value: 1, color: "#242424" }]}
              dataKey="value"
              innerRadius="70%"
              outerRadius="100%"
              paddingAngle={hasData ? 3 : 0}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {(hasData ? data : [{ name: "vazio", value: 1, color: "#242424" }]).map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            {hasData && (
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0];
                  return (
                    <div className="rounded-xl border border-line bg-surface-overlay px-3 py-2 shadow-card">
                      <p className="text-xs text-content-subtle">{p.name}</p>
                      <p className="text-sm font-semibold text-content">
                        {formatValue(Number(p.value ?? 0))}
                      </p>
                    </div>
                  );
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tracking-tight text-content">{centerValue}</span>
          <span className="text-[11px] uppercase tracking-wide text-content-subtle">{centerLabel}</span>
        </div>
      </div>

      <ul className="grid flex-1 gap-2.5 self-stretch">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <li key={d.name} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-content-muted">
                <span className={cn("size-2.5 rounded-sm")} style={{ background: d.color }} />
                {d.name}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-content">{formatValue(d.value)}</span>
                <span className="w-9 text-right text-xs tabular-nums text-content-subtle">{pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
