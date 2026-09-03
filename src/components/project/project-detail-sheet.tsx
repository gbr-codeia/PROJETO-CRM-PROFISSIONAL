"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  CircleDollarSign,
  ExternalLink,
  Pencil,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StatusBadge,
  PriorityBadge,
  FinancialStatusBadge,
} from "@/components/badges";
import { LoadingState } from "@/components/states";
import { ProjectModal } from "@/components/modals/project-modal";
import { PaymentModal } from "@/components/modals/payment-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useActivities,
  useDeletePayment,
  useDeleteProject,
  useProject,
  useUpdateProject,
} from "@/hooks/queries";
import { PROJECT_STATUS, PROJECT_STATUS_ORDER, ACTIVITY_LABEL } from "@/lib/domain";
import { extractLinks, splitNotes } from "@/lib/notes";
import { formatBRL, formatDate, formatDateShort, formatRelative } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { ProjectStatus } from "@/lib/api-types";

export function ProjectDetailSheet({
  projectId,
  onOpenChange,
}: {
  projectId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!projectId;
  const { data: project, isLoading } = useProject(projectId ?? undefined);
  const { data: activitiesRes } = useActivities({ projectId: projectId ?? undefined, pageSize: 20 });
  const updateMut = useUpdateProject(projectId ?? "");
  const deleteMut = useDeleteProject();

  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const incomeRecord = useMemo(
    () => project?.financial?.find((f) => f.type === "INCOME") ?? null,
    [project],
  );
  const delPaymentMut = useDeletePayment(incomeRecord?.id ?? "");

  const notes = splitNotes(project?.notes);
  const links = extractLinks(project?.notes);

  async function changeStatus(status: ProjectStatus) {
    if (!project || status === project.status) return;
    try {
      await updateMut.mutateAsync({ status });
      toast.success(
        status === "DELIVERED"
          ? "Projeto entregue e adicionado ao faturamento."
          : `Status atualizado para “${PROJECT_STATUS[status].label}”.`,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar status.");
    }
  }

  async function handleDelete(financial: "keep" | "cancel") {
    if (!project) return;
    try {
      await deleteMut.mutateAsync({ id: project.id, financial });
      toast.success("Projeto removido.");
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao remover projeto.");
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 scrollbar-thin sm:max-w-md">
          <SheetTitle className="sr-only">Detalhes do projeto</SheetTitle>
          {isLoading || !project ? (
            <div className="p-5">
              <LoadingState rows={6} />
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Header */}
              <div className="border-b border-line p-5 pr-12">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={project.status} />
                  <PriorityBadge priority={project.priority} />
                </div>
                <h2 className="mt-2.5 text-lg font-semibold leading-tight text-content">
                  {project.title}
                </h2>
                <p className="mt-1 text-sm text-content-muted">
                  {project.client?.name}
                  {project.client?.companyName ? ` · ${project.client.companyName}` : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="size-3.5" />
                    Remover
                  </Button>
                </div>
              </div>

              <div className="space-y-6 p-5">
                {/* Status control */}
                <section className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">
                    Status de produção
                  </p>
                  <Select
                    value={project.status}
                    onValueChange={(v) => changeStatus(v as ProjectStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {PROJECT_STATUS[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>

                {/* Meta grid */}
                <section className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <Meta label="Valor" value={formatBRL(project.value)} strong />
                  <Meta label="Tipo" value={project.projectType ?? "—"} />
                  <Meta
                    label="Entrada"
                    value={formatDate(project.entryDate)}
                    icon={<CalendarPlus className="size-3.5" />}
                  />
                  <Meta
                    label="Prazo"
                    value={project.deadline ? formatDate(project.deadline) : "—"}
                    icon={<CalendarClock className="size-3.5" />}
                  />
                  <Meta
                    label="Entregue em"
                    value={project.deliveredAt ? formatDate(project.deliveredAt) : "—"}
                  />
                  <Meta label="Coluna" value={project.kanban?.columnName ?? "—"} />
                </section>

                {project.description && (
                  <section className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">
                      Descrição
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-content-muted">
                      {project.description}
                    </p>
                  </section>
                )}

                {links.length > 0 && (
                  <section className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">
                      Links de arquivos
                    </p>
                    <ul className="space-y-1">
                      {links.map((l) => (
                        <li key={l}>
                          <a
                            href={l}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="size-3.5 shrink-0" />
                            <span className="truncate">{l.replace(/^https?:\/\//, "")}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {notes.text && (
                  <section className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">
                      Observações
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-content-muted">{notes.text}</p>
                  </section>
                )}

                <Separator />

                {/* Financeiro do projeto */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-semibold text-content">
                      <Wallet className="size-4 text-primary" />
                      Financeiro do projeto
                    </p>
                    {incomeRecord && incomeRecord.status !== "PAID" && incomeRecord.status !== "CANCELLED" && (
                      <Button size="sm" onClick={() => setPayOpen(true)}>
                        <CircleDollarSign className="size-3.5" />
                        Registrar pagamento
                      </Button>
                    )}
                  </div>

                  {!incomeRecord ? (
                    <p className="rounded-xl border border-dashed border-line p-3 text-sm text-content-muted">
                      Nenhum lançamento ainda. Ao mover o projeto para <b>Entregue</b>, o
                      faturamento é criado automaticamente.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <MiniStat label="Total" value={formatBRL(incomeRecord.amount)} />
                        <MiniStat label="Recebido" value={formatBRL(incomeRecord.paidAmount)} tone="success" />
                        <MiniStat label="Pendente" value={formatBRL(incomeRecord.remainingAmount)} tone="warning" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-content-muted">
                        <FinancialStatusBadge status={incomeRecord.status} />
                        {incomeRecord.autoGenerated && <span>· lançamento automático</span>}
                      </div>

                      {incomeRecord.payments && incomeRecord.payments.length > 0 && (
                        <ul className="divide-y divide-line rounded-xl border border-line">
                          {incomeRecord.payments.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                              <div className="min-w-0">
                                <p className="font-medium text-content">{formatBRL(p.amount)}</p>
                                <p className="truncate text-xs text-content-muted">
                                  {formatDateShort(p.paymentDate)}
                                  {p.paymentMethod ? ` · ${p.paymentMethod}` : ""}
                                  {p.notes ? ` · ${p.notes}` : ""}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await delPaymentMut.mutateAsync(p.id);
                                    toast.success("Pagamento removido.");
                                  } catch (err) {
                                    toast.error(
                                      err instanceof ApiError ? err.message : "Erro ao remover.",
                                    );
                                  }
                                }}
                                className="shrink-0 rounded-md p-1 text-content-subtle transition-colors hover:bg-danger/10 hover:text-danger"
                                aria-label="Remover pagamento"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </section>

                <Separator />

                {/* Histórico */}
                <section className="space-y-3">
                  <p className="text-sm font-semibold text-content">Histórico de atividades</p>
                  <ul className="space-y-3">
                    {(activitiesRes?.data ?? []).map((a) => (
                      <li key={a.id} className="flex gap-3">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary/60" />
                        <div className="min-w-0">
                          <p className="text-sm text-content">
                            {ACTIVITY_LABEL[a.action] ?? a.action}
                          </p>
                          <p className="text-xs text-content-muted">{a.description}</p>
                          <p className="text-[11px] text-content-subtle">{formatRelative(a.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                    {(activitiesRes?.data ?? []).length === 0 && (
                      <li className="text-sm text-content-muted">Sem atividades registradas.</li>
                    )}
                  </ul>
                </section>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {project && (
        <ProjectModal open={editOpen} onOpenChange={setEditOpen} project={project} />
      )}
      {incomeRecord && (
        <PaymentModal open={payOpen} onOpenChange={setPayOpen} record={incomeRecord} />
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remover projeto?"
        description="Os lançamentos financeiros vinculados são preservados no histórico."
        confirmLabel="Remover e manter financeiro"
        onConfirm={() => handleDelete("keep")}
        secondaryLabel="Remover e cancelar lançamentos"
        onSecondary={() => handleDelete("cancel")}
        loading={deleteMut.isPending}
        danger
      />
    </>
  );
}

function Meta({
  label,
  value,
  icon,
  strong,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-content-subtle">{label}</p>
      <p
        className={`mt-0.5 flex items-center gap-1.5 ${
          strong ? "text-base font-semibold text-content" : "text-content"
        }`}
      >
        {icon && <span className="text-content-subtle">{icon}</span>}
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-raised p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-content-subtle">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold ${
          tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-content"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
