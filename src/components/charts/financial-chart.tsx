"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRLCompact, formatBRL } from "@/lib/format";

export interface ChartPoint {
  label: string;
  value: number;
}

export function FinancialChart({
  data,
  color = "#1ED9B6",
  height = 280,
  formatValue = formatBRL,
}: {
  data: ChartPoint[];
  color?: string;
  height?: number;
  formatValue?: (n: number) => string;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="fc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#242424" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#6a6a6a", fontSize: 11 }}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fill: "#6a6a6a", fontSize: 11 }}
            tickFormatter={(v) => formatBRLCompact(Number(v))}
          />
          <Tooltip
            cursor={{ stroke: color, strokeOpacity: 0.3, strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl border border-line bg-surface-overlay px-3 py-2 shadow-card">
                  <p className="text-xs text-content-subtle">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-content">
                    {formatValue(Number(payload[0].value ?? 0))}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#fc-fill)"
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: "#101010", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
