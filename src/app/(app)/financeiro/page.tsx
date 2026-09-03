"use client";

import { useMemo, useState } from "react";
import { MoreVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/data-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { FinancialStatusBadge, TypeBadge } from "@/components/badges";
import { FinancialModal } from "@/components/modals/financial-modal";
import { PaymentModal } from "@/components/modals/payment-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePeriod } from "@/components/period-context";
import {
  useClients,
  useDashboard,
  useDeleteFinancial,
  useFinancial,
} from "@/hooks/queries";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/lib/domain";
import { formatBRL, formatDateShort } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { FinancialRecord } from "@/lib/api-types";

const ALL_CATEGORIES = Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));

export default function FinanceiroPage() {
  const { period } = usePeriod();
  const dash = useDashboard(period.month, period.year);
  const { data: clientsRes } = useClients({ pageSize: 100, sortBy: "name", sortDir: "asc" });

  const [type, setType] = useState<"all" | "INCOME" | "EXPENSE">("all");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [clientId, setClientId] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<FinancialRecord | null>(null);
  const [payRecord, setPayRecord] = useState<FinancialRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<FinancialRecord | null>(null);

  const deleteMut = useDeleteFinancial();

  const { data, isLoading, isError, refetch, isFetching } = useFinancial({
    month: period.month,
    year: period.year,
    type: type === "all" ? undefined : type,
    status: status === "all" ? undefined : status,
    category: category === "all" ? undefined : category,
    clientId: clientId === "all" ? undefined : clientId,
    page,
    pageSize: 15,
    sortBy: "createdAt",
    sortDir: "desc",
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const clients = clientsRes?.data ?? [];

  const summary = useMemo(() => {
    const d = dash.data;
    return [
      { label: "Faturamento", value: d?.revenue.forecast ?? 0, tone: "" },
      { label: "Recebido", value: d?.revenue.received ?? 0, tone: "success" },
      { label: "Pendente", value: d?.revenue.pending ?? 0, tone: "warning" },
      { label: "Despesas", value: d?.expenses.total ?? 0, tone: "danger" },
      { label: "Lucro", value: d?.netProfit ?? 0, tone: "primary" },
    ] as const;
  }, [dash.data]);

  const columns: Column<FinancialRecord>[] = [
    {
      key: "date",
      header: "Data",
      cell: (r) => (
        <span className="text-content-muted">
          {formatDateShort(r.dueDate ?? r.paidAt ?? r.createdAt)}
        </span>
      ),
    },
    {
      key: "desc",
      header: "Descrição",
      primary: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-content">{r.description}</p>
          <p className="truncate text-xs text-content-subtle">
            {r.client?.name ?? r.project?.title ?? "Sem vínculo"}
          </p>
        </div>
      ),
    },
    { key: "category", header: "Categoria", cell: (r) => <span className="text-content-muted">{r.category}</span> },
    { key: "type", header: "Tipo", cell: (r) => <TypeBadge type={r.type} /> },
    {
      key: "amount",
      header: "Valor",
      align: "right",
      cell: (r) => <span className="tabular-nums">{formatBRL(r.amount)}</span>,
    },
    {
      key: "received",
      header: "Recebido",
      align: "right",
      cell: (r) => <span className="tabular-nums text-success">{formatBRL(r.paidAmount)}</span>,
    },
    {
      key: "pending",
      header: "Pendente",
      align: "right",
      cell: (r) => <span className="tabular-nums text-warning">{formatBRL(r.remainingAmount)}</span>,
    },
    { key: "status", header: "Status", cell: (r) => <FinancialStatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      hideOnMobile: true,
      align: "right",
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="rounded-md p-1 text-content-subtle hover:bg-surface-raised hover:text-content"
            >
              <MoreVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {r.type === "INCOME" && r.status !== "PAID" && r.status !== "CANCELLED" && (
              <DropdownMenuItem onSelect={() => setPayRecord(r)}>Registrar pagamento</DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => setEditRecord(r)}>Editar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem danger onSelect={() => setDeleteRecord(r)}>
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financeiro"
        description="Receitas, despesas e recebimentos do período."
        actions={
          <Button
            onClick={() => {
              setEditRecord(null);
              setModalOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo lançamento
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {summary.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-content-subtle">{s.label}</p>
            <p
              className={`mt-1 text-lg font-semibold tracking-tight ${
                s.tone === "success"
                  ? "text-success"
                  : s.tone === "warning"
                    ? "text-warning"
                    : s.tone === "danger"
                      ? "text-danger"
                      : s.tone === "primary"
                        ? "text-primary"
                        : "text-content"
              }`}
            >
              {formatBRL(s.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select value={type} onValueChange={(v) => { setType(v as typeof type); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="INCOME">Receitas</SelectItem>
            <SelectItem value="EXPENSE">Despesas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="PENDING">Pendente</SelectItem>
            <SelectItem value="PARTIAL">Parcial</SelectItem>
            <SelectItem value="PAID">Pago</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {ALL_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={clientId} onValueChange={(v) => { setClientId(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <LoadingState rows={6} />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Nenhum lançamento neste período"
              description="Ajuste os filtros ou crie um novo lançamento."
            />
          ) : (
            <div className={isFetching ? "opacity-60 transition-opacity" : ""}>
              <DataTable
                data={rows}
                columns={columns}
                rowKey={(r) => r.id}
                onRowClick={(r) => setEditRecord(r)}
                dense
              />
              <Pagination
                page={page}
                totalPages={meta?.totalPages ?? 1}
                total={meta?.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <FinancialModal
        open={modalOpen || !!editRecord}
        onOpenChange={(o) => {
          if (!o) {
            setModalOpen(false);
            setEditRecord(null);
          }
        }}
        record={editRecord}
        defaultMonth={period.month}
        defaultYear={period.year}
      />

      <PaymentModal
        open={!!payRecord}
        onOpenChange={(o) => !o && setPayRecord(null)}
        record={payRecord}
      />

      <ConfirmDialog
        open={!!deleteRecord}
        onOpenChange={(o) => !o && setDeleteRecord(null)}
        title="Excluir lançamento?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
        loading={deleteMut.isPending}
        onConfirm={async () => {
          if (!deleteRecord) return;
          try {
            await deleteMut.mutateAsync(deleteRecord.id);
            toast.success("Lançamento excluído.");
            setDeleteRecord(null);
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Erro ao excluir.");
          }
        }}
      />
    </div>
  );
}
