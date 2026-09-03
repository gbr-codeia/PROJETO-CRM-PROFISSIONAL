"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  AtSign,
  Instagram,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/data-table";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import { StatusBadge, PaymentBadge } from "@/components/badges";
import { ClientModal } from "@/components/modals/client-modal";
import { ProjectModal } from "@/components/modals/project-modal";
import { ProjectDetailSheet } from "@/components/project/project-detail-sheet";
import {
  useActivities,
  useClient,
  useFinancial,
  useProjects,
} from "@/hooks/queries";
import { ACTIVITY_LABEL } from "@/lib/domain";
import { formatBRL, formatDateShort, formatRelative, waLink } from "@/lib/format";
import type { Project } from "@/lib/api-types";

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoading, isError, refetch } = useClient(id);
  const projectsRes = useProjects({ clientId: id, pageSize: 100, sortBy: "updatedAt", sortDir: "desc" });
  const incomeRes = useFinancial({ clientId: id, type: "INCOME", pageSize: 100 });
  const activityRes = useActivities({ pageSize: 40 });

  const [editOpen, setEditOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [openProject, setOpenProject] = useState<string | null>(null);

  const projects = useMemo(() => projectsRes.data?.data ?? [], [projectsRes.data]);
  const projectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);

  const stats = useMemo(() => {
    const income = incomeRes.data?.data ?? [];
    const billed = projects
      .filter((p) => p.status !== "CANCELLED")
      .reduce((s, p) => s + p.value, 0);
    const received = income.reduce((s, r) => s + r.paidAmount, 0);
    const pending = income
      .filter((r) => r.status !== "CANCELLED")
      .reduce((s, r) => s + r.remainingAmount, 0);
    const active = projects.filter(
      (p) => p.status !== "DELIVERED" && p.status !== "CANCELLED",
    ).length;
    return { billed, received, pending, active };
  }, [projects, incomeRes.data]);

  const activities = (activityRes.data?.data ?? []).filter(
    (a) => a.projectId && projectIds.has(a.projectId),
  );

  const columns: Column<Project>[] = [
    {
      key: "title",
      header: "Projeto",
      primary: true,
      cell: (p) => <span className="font-medium text-content">{p.title}</span>,
    },
    { key: "value", header: "Valor", align: "right", cell: (p) => formatBRL(p.value) },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    { key: "pay", header: "Financeiro", cell: (p) => <PaymentBadge status={p.paymentStatus} /> },
    {
      key: "deadline",
      header: "Prazo",
      align: "right",
      cell: (p) => (p.deadline ? formatDateShort(p.deadline) : "—"),
    },
  ];

  if (isLoading) return <LoadingState rows={8} />;
  if (isError || !client) return <ErrorState onRetry={() => refetch()} />;

  const wa = waLink(client.whatsapp ?? client.phone);

  return (
    <div className="space-y-5">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-content-muted transition-colors hover:text-content"
      >
        <ArrowLeft className="size-4" />
        Clientes
      </Link>

      <PageHeader
        title={client.name}
        description={client.companyName ?? undefined}
        actions={
          <>
            {wa && (
              <Button variant="secondary" asChild>
                <a href={wa} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Editar
            </Button>
            <Button onClick={() => setNewProjectOpen(true)}>
              <Plus className="size-4" />
              Novo projeto
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow icon={<AtSign className="size-4" />} value={client.email} />
            <InfoRow icon={<Phone className="size-4" />} value={client.phone} />
            <InfoRow
              icon={<MessageCircle className="size-4" />}
              value={client.whatsapp}
              href={wa ?? undefined}
            />
            <InfoRow
              icon={<Instagram className="size-4" />}
              value={client.instagram ? `@${client.instagram}` : null}
              href={client.instagram ? `https://instagram.com/${client.instagram}` : undefined}
            />
            {client.notes && (
              <p className="whitespace-pre-wrap border-t border-line pt-3 text-content-muted">
                {client.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4 lg:content-start">
          <MiniCard label="Total faturado" value={formatBRL(stats.billed)} />
          <MiniCard label="Total recebido" value={formatBRL(stats.received)} tone="success" />
          <MiniCard label="Pendente" value={formatBRL(stats.pending)} tone="warning" />
          <MiniCard label="Projetos ativos" value={String(stats.active)} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projetos</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <EmptyState title="Nenhum projeto para este cliente" />
          ) : (
            <DataTable
              data={projects}
              columns={columns}
              rowKey={(p) => p.id}
              onRowClick={(p) => setOpenProject(p.id)}
              dense
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-content-muted">Sem atividades recentes.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                  <div>
                    <p className="text-sm text-content">{ACTIVITY_LABEL[a.action] ?? a.action}</p>
                    <p className="text-xs text-content-muted">{a.description}</p>
                    <p className="text-[11px] text-content-subtle">{formatRelative(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ClientModal open={editOpen} onOpenChange={setEditOpen} client={client} />
      <ProjectModal
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        defaultClientId={client.id}
        onCreated={(p) => setOpenProject(p.id)}
      />
      <ProjectDetailSheet projectId={openProject} onOpenChange={(o) => !o && setOpenProject(null)} />
    </div>
  );
}

function InfoRow({
  icon,
  value,
  href,
}: {
  icon: React.ReactNode;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value) return null;
  const content = (
    <span className="flex items-center gap-2.5">
      <span className="text-content-subtle">{icon}</span>
      <span className={href ? "text-primary" : "text-content-muted"}>{value}</span>
    </span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="block hover:underline">
      {content}
    </a>
  ) : (
    <div>{content}</div>
  );
}

function MiniCard({
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
        className={`mt-1 text-lg font-semibold ${
          tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-content"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
