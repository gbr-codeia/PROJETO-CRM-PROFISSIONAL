"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { PaymentBadge } from "@/components/badges";
import { usePeriod } from "@/components/period-context";
import { useMonthlyReport } from "@/hooks/queries";
import { buildQuery } from "@/lib/api";
import { formatBRL, formatDateShort, monthLabel } from "@/lib/format";
import type { MonthlyReport } from "@/lib/api-types";

type ReportRow = MonthlyReport["rows"][number];

export default function RelatoriosPage() {
  const { period } = usePeriod();
  const { data, isLoading, isError, refetch } = useMonthlyReport(period.month, period.year);

  const [range, setRange] = useState({ from: "", to: "" });
  const useRange = !!range.from && !!range.to;

  const csvHref =
    "/api/reports/export/csv" +
    buildQuery(
      useRange
        ? { from: range.from, to: range.to }
        : { month: period.month, year: period.year },
    );

  const columns: Column<ReportRow>[] = [
    {
      key: "deliveredAt",
      header: "Entrega",
      cell: (r) => <span className="text-content-muted">{formatDateShort(r.deliveredAt)}</span>,
    },
    { key: "client", header: "Cliente", cell: (r) => r.clientName },
    {
      key: "project",
      header: "Projeto",
      primary: true,
      cell: (r) => <span className="font-medium text-content">{r.projectTitle}</span>,
    },
    {
      key: "value",
      header: "Valor Total",
      align: "right",
      cell: (r) => <span className="tabular-nums">{formatBRL(r.value)}</span>,
    },
    {
      key: "received",
      header: "Recebido",
      align: "right",
      cell: (r) => <span className="tabular-nums text-success">{formatBRL(r.received)}</span>,
    },
    {
      key: "pending",
      header: "Pendente",
      align: "right",
      cell: (r) => <span className="tabular-nums text-warning">{formatBRL(r.pending)}</span>,
    },
    { key: "status", header: "Status", cell: (r) => <PaymentBadge status={r.paymentStatus} /> },
  ];

  const summary = data?.summary;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatórios"
        description={`Fechamento de ${monthLabel(period.month, period.year)} — use o seletor de período no topo.`}
        actions={
          <div className="flex gap-2">
            <Button asChild>
              <a href={csvHref} download>
                <Download className="size-4" />
                Exportar CSV
              </a>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="secondary" disabled>
                    <FileSpreadsheet className="size-4" />
                    Excel
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Em breve</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="secondary" disabled>
                    <FileText className="size-4" />
                    PDF
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Em breve</TooltipContent>
            </Tooltip>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Período personalizado (apenas exportação CSV)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="De" htmlFor="r-from">
              <Input
                id="r-from"
                type="date"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </Field>
            <Field label="Até" htmlFor="r-to">
              <Input
                id="r-to"
                type="date"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </Field>
            <div className="flex items-end">
              <p className="text-xs text-content-subtle">
                {useRange
                  ? "A exportação usará o intervalo acima."
                  : "Sem intervalo: exporta o mês selecionado no topo."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {isLoading ? (
        <LoadingState rows={2} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard label="Faturamento bruto" value={formatBRL(summary?.grossRevenue ?? 0)} />
          <SummaryCard label="Recebido" value={formatBRL(summary?.totalReceived ?? 0)} tone="success" />
          <SummaryCard label="Pendente" value={formatBRL(summary?.totalPending ?? 0)} tone="warning" />
          <SummaryCard label="Ticket médio" value={formatBRL(summary?.averageTicket ?? 0)} />
          <SummaryCard label="Trabalhos" value={String(summary?.jobsCount ?? 0)} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Projetos entregues — {monthLabel(period.month, period.year)}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState rows={5} />
          ) : (data?.rows ?? []).length === 0 ? (
            <EmptyState
              title="Nenhuma entrega neste mês"
              description="Assim que um projeto for movido para “Entregue”, ele aparece aqui."
            />
          ) : (
            <DataTable data={data!.rows} columns={columns} rowKey={(r) => r.projectId} dense />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-[11px] uppercase tracking-wide text-content-subtle">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tracking-tight ${
          tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-content"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
