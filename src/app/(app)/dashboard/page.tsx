"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CardsSkeleton, EmptyState, ErrorState } from "@/components/states";
import { DataTable, type Column } from "@/components/data-table";
import { FinancialChart } from "@/components/charts/financial-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { MiniCalendar } from "@/components/dashboard/mini-calendar";
import { StatusBadge, PaymentBadge } from "@/components/badges";
import { ProjectDetailSheet } from "@/components/project/project-detail-sheet";
import { usePeriod } from "@/components/period-context";
import {
  useCharts,
  useDashboard,
  useFinancial,
  useProjects,
} from "@/hooks/queries";
import { formatBRL, formatBRLCompact, formatDateShort } from "@/lib/format";
import type { Project } from "@/lib/api-types";

type Metric = "forecast" | "received" | "profit";

export default function DashboardPage() {
  const { period } = usePeriod();
  const dash = useDashboard(period.month, period.year);
  const charts = useCharts(12, period.year);
  const recent = useProjects({ pageSize: 6, sortBy: "updatedAt", sortDir: "desc" });
  const calProjects = useProjects({ pageSize: 100 });
  const incomeMonth = useFinancial({
    type: "INCOME",
    month: period.month,
    year: period.year,
    pageSize: 100,
  });

  const [metric, setMetric] = useState<Metric>("forecast");
  const [openProject, setOpenProject] = useState<string | null>(null);

  const monthKey = `${period.year}-${String(period.month).padStart(2, "0")}`;

  const deltas = useMemo(() => {
    const mr = charts.data?.monthlyRevenue ?? [];
    const idx = mr.findIndex((m) => m.key === monthKey);
    const cur = idx >= 0 ? mr[idx] : undefined;
    const prev = idx > 0 ? mr[idx - 1] : undefined;
    const pct = (a?: number, b?: number) =>
      b === undefined || b === 0 || a === undefined ? null : Number((((a - b) / b) * 100).toFixed(1));
    return {
      forecast: pct(cur?.forecast, prev?.forecast),
      received: pct(cur?.received, prev?.received),
      pending: pct(cur?.pending, prev?.pending),
    };
  }, [charts.data, monthKey]);

  const chartData = useMemo(() => {
    if (!charts.data) return [];
    if (metric === "profit") {
      return charts.data.incomeVsExpense.map((d) => ({ label: d.label, value: d.net }));
    }
    return charts.data.monthlyRevenue.map((d) => ({
      label: d.label,
      value: metric === "forecast" ? d.forecast : d.received,
    }));
  }, [charts.data, metric]);

  const donut = useMemo(() => {
    const rows = incomeMonth.data?.data ?? [];
    let received = 0;
    let partial = 0;
    let pending = 0;
    for (const r of rows) {
      if (r.status === "PAID") received += r.amount;
      else if (r.status === "PARTIAL") partial += r.amount;
      else if (r.status === "PENDING") pending += r.amount;
    }
    return {
      slices: [
        { name: "Recebido", value: Number(received.toFixed(2)), color: "#1ED9B6" },
        { name: "Parcial", value: Number(partial.toFixed(2)), color: "#5aa8f5" },
        { name: "Pendente", value: Number(pending.toFixed(2)), color: "#f5b544" },
      ],
      count: rows.length,
    };
  }, [incomeMonth.data]);

  const columns: Column<Project>[] = [
    {
      key: "client",
      header: "Cliente",
      mobileLabel: "Cliente",
      cell: (p) => <span className="text-content-muted">{p.client?.name ?? "—"}</span>,
    },
    {
      key: "title",
      header: "Projeto",
      primary: true,
      cell: (p) => <span className="font-medium text-content">{p.title}</span>,
    },
    {
      key: "value",
      header: "Valor",
      align: "right",
      cell: (p) => <span className="tabular-nums">{formatBRL(p.value)}</span>,
    },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    {
      key: "payment",
      header: "Financeiro",
      cell: (p) => <PaymentBadge status={p.paymentStatus} />,
    },
    {
      key: "deadline",
      header: "Entrega",
      align: "right",
      cell: (p) => (
        <span className="text-content-muted">
          {p.deliveredAt ? formatDateShort(p.deliveredAt) : p.deadline ? formatDateShort(p.deadline) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Visão geral do mês — faturamento, recebimentos e produção."
      />

      {/* Stat cards */}
      {dash.isLoading ? (
        <CardsSkeleton />
      ) : dash.isError ? (
        <ErrorState onRetry={() => dash.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            index={0}
            accent
            label="Faturamento"
            value={formatBRL(dash.data!.revenue.forecast)}
            icon={TrendingUp}
            changePct={deltas.forecast}
          />
          <StatCard
            index={1}
            label="Recebido"
            value={formatBRL(dash.data!.revenue.received)}
            icon={Banknote}
            changePct={deltas.received}
          />
          <StatCard
            index={2}
            label="Pendente"
            value={formatBRL(dash.data!.revenue.pending)}
            icon={Clock3}
            changePct={deltas.pending}
          />
          <StatCard
            index={3}
            label="Projetos entregues"
            value={String(dash.data!.projects.delivered)}
            icon={CheckCircle2}
            changePct={null}
            hint={`${dash.data!.projects.inProgress} em andamento`}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
            <CardTitle>Evolução Financeira</CardTitle>
            <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
              <TabsList>
                <TabsTrigger value="forecast">Faturamento</TabsTrigger>
                <TabsTrigger value="received">Recebido</TabsTrigger>
                <TabsTrigger value="profit">Lucro</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {charts.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <FinancialChart
                data={chartData}
                color={metric === "profit" ? "#5aa8f5" : "#1ED9B6"}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeMonth.isLoading ? (
              <Skeleton className="mx-auto h-[200px] w-[200px] rounded-full" />
            ) : (
              <DonutChart
                data={donut.slices}
                centerValue={formatBRLCompact(donut.slices.reduce((s, d) => s + d.value, 0))}
                centerLabel={`${donut.count} lanç.`}
                formatValue={formatBRL}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent + calendar */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Projetos recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (recent.data?.data ?? []).length === 0 ? (
                <EmptyState title="Nenhum projeto ainda" description="Crie seu primeiro projeto na aba Projetos." />
              ) : (
                <DataTable
                  data={recent.data!.data}
                  columns={columns}
                  rowKey={(p) => p.id}
                  onRowClick={(p) => setOpenProject(p.id)}
                  dense
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle>Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniCalendar
              month={period.month}
              year={period.year}
              projects={calProjects.data?.data ?? []}
              onSelectProject={(id) => setOpenProject(id)}
            />
          </CardContent>
        </Card>
      </div>

      <ProjectDetailSheet
        projectId={openProject}
        onOpenChange={(o) => !o && setOpenProject(null)}
      />
    </div>
  );
}
