"use client";

import { useEffect, useState } from "react";
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
import { useCreateClient, useUpdateClient } from "@/hooks/queries";
import { ApiError } from "@/lib/api";
import type { Client } from "@/lib/api-types";

const empty = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  notes: "",
};

export function ClientModal({
  open,
  onOpenChange,
  client,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  client?: Client | null;
  onSaved?: (client: Client) => void;
}) {
  const isEdit = !!client;
  const createMut = useCreateClient();
  const updateMut = useUpdateClient(client?.id ?? "");
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!open) return;
    setForm(
      client
        ? {
            name: client.name,
            companyName: client.companyName ?? "",
            email: client.email ?? "",
            phone: client.phone ?? "",
            whatsapp: client.whatsapp ?? "",
            instagram: client.instagram ?? "",
            notes: client.notes ?? "",
          }
        : empty,
    );
  }, [open, client]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim().length >= 2;
  const pending = createMut.isPending || updateMut.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const payload = {
      name: form.name.trim(),
      companyName: form.companyName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      whatsapp: form.whatsapp || undefined,
      instagram: form.instagram || undefined,
      notes: form.notes || undefined,
    };
    try {
      const saved = isEdit
        ? await updateMut.mutateAsync(payload)
        : await createMut.mutateAsync(payload);
      toast.success(isEdit ? "Cliente atualizado." : "Cliente criado.");
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar o cliente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <FieldGrid>
            <Field label="Nome" required htmlFor="c-name">
              <Input id="c-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Empresa" htmlFor="c-company">
              <Input
                id="c-company"
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
              />
            </Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="E-mail" htmlFor="c-email">
              <Input id="c-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Instagram" htmlFor="c-ig">
              <Input
                id="c-ig"
                value={form.instagram}
                onChange={(e) => set("instagram", e.target.value)}
                placeholder="@estudio"
              />
            </Field>
          </FieldGrid>
          <FieldGrid>
            <Field label="Telefone" htmlFor="c-phone">
              <Input
                id="c-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+55 11 90000-0000"
              />
            </Field>
            <Field label="WhatsApp" htmlFor="c-wa">
              <Input
                id="c-wa"
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                placeholder="+55 11 90000-0000"
              />
            </Field>
          </FieldGrid>
          <Field label="Observações" htmlFor="c-notes">
            <Textarea id="c-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending} disabled={!canSubmit}>
              {isEdit ? "Salvar" : "Criar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
