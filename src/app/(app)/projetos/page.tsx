"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/data-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { StatusBadge, PaymentBadge, PriorityBadge } from "@/components/badges";
import { ProjectModal } from "@/components/modals/project-modal";
import { ProjectDetailSheet } from "@/components/project/project-detail-sheet";
import { useProjects } from "@/hooks/queries";
import { useDebounced } from "@/hooks/use-debounced";
import { formatBRL, formatDateShort } from "@/lib/format";
import type { Project } from "@/lib/api-types";

const FILTERS = {
  all: { label: "Todos", status: undefined as string[] | undefined },
  active: { label: "Em andamento", status: ["NEW", "WAITING_MATERIAL", "EDITING", "REVIEW", "ADJUSTMENTS"] },
  delivered: { label: "Entregues", status: ["DELIVERED"] },
  cancelled: { label: "Cancelados", status: ["CANCELLED"] },
} as const;

type FilterKey = keyof typeof FILTERS;

function ProjetosInner() {
  const params = useSearchParams();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [openProject, setOpenProject] = useState<string | null>(null);

  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    const open = params.get("open");
    if (open) setOpenProject(open);
  }, [params]);

  useEffect(() => setPage(1), [filter, debouncedSearch]);

  const statusFilter = FILTERS[filter].status;
  const { data, isLoading, isError, refetch, isFetching } = useProjects({
    page,
    pageSize: 12,
    search: debouncedSearch || undefined,
    status: statusFilter ? [...statusFilter] : undefined,
    sortBy: "updatedAt",
    sortDir: "desc",
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const columns: Column<Project>[] = [
    {
      key: "client",
      header: "Cliente",
      cell: (p) => <span className="text-content-muted">{p.client?.name ?? "—"}</span>,
    },
    {
      key: "title",
      header: "Projeto",
      primary: true,
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-content">{p.title}</p>
          <p className="truncate text-xs text-content-subtle">{p.projectType ?? "Sem tipo"}</p>
        </div>
      ),
    },
    {
      key: "value",
      header: "Valor",
      align: "right",
      cell: (p) => <span className="tabular-nums">{formatBRL(p.value)}</span>,
    },
    {
      key: "deadline",
      header: "Prazo",
      align: "right",
      cell: (p) => <span className="text-content-muted">{p.deadline ? formatDateShort(p.deadline) : "—"}</span>,
    },
    { key: "priority", header: "Prioridade", cell: (p) => <PriorityBadge priority={p.priority} /> },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    { key: "payment", header: "Pagamento", cell: (p) => <PaymentBadge status={p.paymentStatus} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projetos"
        description="Todos os trabalhos, do briefing à entrega."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo projeto
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <TabsList className="w-full overflow-x-auto sm:w-auto">
            {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
              <TabsTrigger key={k} value={k}>
                {FILTERS[k].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-subtle" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar projeto ou cliente…"
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <LoadingState rows={6} />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Nenhum projeto encontrado"
              description={debouncedSearch ? "Tente outra busca." : "Crie seu primeiro projeto."}
              action={
                !debouncedSearch ? (
                  <Button onClick={() => setCreateOpen(true)} size="sm">
                    <Plus className="size-4" />
                    Novo projeto
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className={isFetching ? "opacity-60 transition-opacity" : ""}>
              <DataTable
                data={rows}
                columns={columns}
                rowKey={(p) => p.id}
                onRowClick={(p) => setOpenProject(p.id)}
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

      <ProjectModal open={createOpen} onOpenChange={setCreateOpen} onCreated={(p) => setOpenProject(p.id)} />
      <ProjectDetailSheet projectId={openProject} onOpenChange={(o) => !o && setOpenProject(null)} />
    </div>
  );
}

export default function ProjetosPage() {
  return (
    <Suspense fallback={<LoadingState rows={8} />}>
      <ProjetosInner />
    </Suspense>
  );
}
