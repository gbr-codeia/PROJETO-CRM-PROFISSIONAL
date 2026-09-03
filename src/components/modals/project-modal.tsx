"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGrid } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  useClients,
  useCreateProject,
  useUpdateProject,
} from "@/hooks/queries";
import { CARD_COLORS, PRIORITY, PROJECT_TYPES } from "@/lib/domain";
import { joinNotes, splitNotes } from "@/lib/notes";
import { ApiError } from "@/lib/api";
import type { Priority, Project, PaymentStatus } from "@/lib/api-types";

interface ProjectModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project?: Project | null;
  defaultClientId?: string;
  defaultColumnId?: string;
  onCreated?: (project: Project) => void;
}

const emptyForm = {
  clientId: "",
  title: "",
  projectType: "",
  description: "",
  value: 0,
  entryDate: new Date().toISOString().slice(0, 10),
  deadline: "",
  priority: "MEDIUM" as Priority,
  paymentStatus: "PENDING" as PaymentStatus,
  color: "" as string,
  notes: "",
  links: "",
};

export function ProjectModal({
  open,
  onOpenChange,
  project,
  defaultClientId,
  defaultColumnId,
  onCreated,
}: ProjectModalProps) {
  const isEdit = !!project;
  const { data: clientsRes } = useClients({ pageSize: 100, sortBy: "name", sortDir: "asc" });
  const clients = useMemo(() => clientsRes?.data ?? [], [clientsRes]);

  const createMut = useCreateProject();
  const updateMut = useUpdateProject(project?.id ?? "");

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (project) {
      const { text, links } = splitNotes(project.notes);
      setForm({
        clientId: project.clientId,
        title: project.title,
        projectType: project.projectType ?? "",
        description: project.description ?? "",
        value: project.value,
        entryDate: project.entryDate.slice(0, 10),
        deadline: project.deadline ? project.deadline.slice(0, 10) : "",
        priority: project.priority,
        paymentStatus: project.paymentStatus,
        color: project.color ?? "",
        notes: text,
        links,
      });
    } else {
      setForm({ ...emptyForm, clientId: defaultClientId ?? "" });
    }
  }, [open, project, defaultClientId]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pending = createMut.isPending || updateMut.isPending;
  const canSubmit = form.clientId && form.title.trim().length >= 2;

  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: c.id, label: c.companyName ? `${c.name} · ${c.companyName}` : c.name })),
    [clients],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const payload: Record<string, unknown> = {
      clientId: form.clientId,
      title: form.title.trim(),
      projectType: form.projectType || undefined,
      description: form.description || undefined,
      value: form.value,
      entryDate: form.entryDate || undefined,
      deadline: form.deadline || undefined,
      priority: form.priority,
      paymentStatus: form.paymentStatus,
      color: isEdit ? form.color || null : form.color || undefined,
      notes: joinNotes(form.notes, form.links),
    };

    try {
      if (isEdit && project) {
        await updateMut.mutateAsync(payload);
        toast.success("Projeto atualizado.");
      } else {
        if (defaultColumnId) payload.columnId = defaultColumnId;
        const created = await createMut.mutateAsync(payload);
        toast.success("Projeto criado.");
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar o projeto.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar projeto" : "Novo projeto"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FieldGrid>
            <Field label="Cliente" required htmlFor="p-client">
              <Select value={form.clientId} onValueChange={(v) => set("clientId", v)}>
                <SelectTrigger id="p-client">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.length === 0 && (
                    <div className="px-2 py-3 text-sm text-content-muted">Cadastre um cliente primeiro.</div>
                  )}
                  {clientOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Tipo de projeto" htmlFor="p-type">
              <Select value={form.projectType} onValueChange={(v) => set("projectType", v)}>
                <SelectTrigger id="p-type">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGrid>

          <Field label="Nome do projeto" required htmlFor="p-title">
            <Input
              id="p-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex.: Vídeo institucional — Empresa X"
            />
          </Field>

          <Field label="Descrição" htmlFor="p-desc">
            <Textarea
              id="p-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Escopo, formato de entrega, referências…"
            />
          </Field>

          <FieldGrid>
            <Field label="Valor" htmlFor="p-value">
              <CurrencyInput value={form.value} onValueChange={(n) => set("value", n)} />
            </Field>
            <Field label="Prioridade" htmlFor="p-priority">
              <Select value={form.priority} onValueChange={(v) => set("priority", v as Priority)}>
                <SelectTrigger id="p-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGrid>

          <Field label="Cor (tag)" htmlFor="p-color">
            <div className="flex items-center gap-2">
              {CARD_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => set("color", form.color === c.hex ? "" : c.hex)}
                  title={c.label}
                  aria-label={`Cor ${c.label}`}
                  className={
                    "size-6 rounded-full transition-transform hover:scale-110 " +
                    (form.color === c.hex
                      ? "scale-110 ring-2 ring-content ring-offset-2 ring-offset-surface"
                      : "")
                  }
                  style={{ background: c.hex }}
                />
              ))}
              {form.color && (
                <button
                  type="button"
                  onClick={() => set("color", "")}
                  className="text-xs text-content-subtle hover:text-content"
                >
                  limpar
                </button>
              )}
            </div>
          </Field>

          <FieldGrid>
            <Field label="Data de entrada" htmlFor="p-entry">
              <Input
                id="p-entry"
                type="date"
                value={form.entryDate}
                onChange={(e) => set("entryDate", e.target.value)}
              />
            </Field>
            <Field label="Prazo" htmlFor="p-deadline">
              <Input
                id="p-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
              />
            </Field>
          </FieldGrid>

          <Field
            label="Status financeiro inicial"
            htmlFor="p-pay"
            hint="A entrega registra o faturamento automaticamente; o recebimento é controlado à parte."
          >
            <Select
              value={form.paymentStatus}
              onValueChange={(v) => set("paymentStatus", v as PaymentStatus)}
            >
              <SelectTrigger id="p-pay">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="PARTIAL">Parcial</SelectItem>
                <SelectItem value="PAID">Pago</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Links de arquivos" htmlFor="p-links" hint="Um link por linha (Drive, Frame.io, WeTransfer…).">
            <Textarea
              id="p-links"
              value={form.links}
              onChange={(e) => set("links", e.target.value)}
              placeholder={"https://drive.google.com/…\nhttps://f.io/…"}
              className="min-h-[70px]"
            />
          </Field>

          <Field label="Observações" htmlFor="p-notes">
            <Textarea
              id="p-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="min-h-[70px]"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending} disabled={!canSubmit}>
              {isEdit ? "Salvar alterações" : "Criar projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
