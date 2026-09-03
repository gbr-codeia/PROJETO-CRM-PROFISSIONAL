"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/data-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ClientModal } from "@/components/modals/client-modal";
import { useClients, useProjects } from "@/hooks/queries";
import { useDebounced } from "@/hooks/use-debounced";
import { formatBRL, waLink } from "@/lib/format";
import type { Client } from "@/lib/api-types";

export default function ClientesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const debounced = useDebounced(search);

  const { data, isLoading, isError, refetch, isFetching } = useClients({
    page,
    pageSize: 15,
    search: debounced || undefined,
    sortBy: "name",
    sortDir: "asc",
  });

  const allProjects = useProjects({ pageSize: 100 });
  const billedByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allProjects.data?.data ?? []) {
      if (p.status === "CANCELLED") continue;
      map.set(p.clientId, (map.get(p.clientId) ?? 0) + p.value);
    }
    return map;
  }, [allProjects.data]);

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const columns: Column<Client>[] = [
    {
      key: "name",
      header: "Nome",
      primary: true,
      cell: (c) => (
        <div>
          <p className="font-medium text-content">{c.name}</p>
          <p className="text-xs text-content-subtle">{c.companyName ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "whatsapp",
      header: "WhatsApp",
      cell: (c) => {
        const link = waLink(c.whatsapp ?? c.phone);
        return link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            <MessageCircle className="size-3.5" />
            Abrir
          </a>
        ) : (
          <span className="text-content-subtle">—</span>
        );
      },
    },
    {
      key: "email",
      header: "E-mail",
      cell: (c) => <span className="text-content-muted">{c.email ?? "—"}</span>,
    },
    {
      key: "projects",
      header: "Projetos",
      align: "center",
      cell: (c) => <span className="tabular-nums">{c.projectsCount ?? 0}</span>,
    },
    {
      key: "billed",
      header: "Faturado",
      align: "right",
      cell: (c) => (
        <span className="tabular-nums text-content">{formatBRL(billedByClient.get(c.id) ?? 0)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        description="Sua base de contatos e o histórico de cada um."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo cliente
          </Button>
        }
      />

      <div className="relative sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-subtle" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar cliente…"
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <LoadingState rows={6} />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Nenhum cliente"
              description={debounced ? "Tente outra busca." : "Cadastre seu primeiro cliente."}
              action={
                !debounced ? (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    Novo cliente
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className={isFetching ? "opacity-60 transition-opacity" : ""}>
              <DataTable
                data={rows}
                columns={columns}
                rowKey={(c) => c.id}
                onRowClick={(c) => router.push(`/clientes/${c.id}`)}
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

      <ClientModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(c) => router.push(`/clientes/${c.id}`)}
      />
    </div>
  );
}
