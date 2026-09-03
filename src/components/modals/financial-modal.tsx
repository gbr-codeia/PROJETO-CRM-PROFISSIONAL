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
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients, useCreateFinancial, useUpdateFinancial } from "@/hooks/queries";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
} from "@/lib/domain";
import { monthName } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { FinancialRecord, FinancialType } from "@/lib/api-types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  record?: FinancialRecord | null;
  defaultType?: FinancialType;
  defaultMonth: number;
  defaultYear: number;
}

export function FinancialModal({
  open,
  onOpenChange,
  record,
  defaultType = "INCOME",
  defaultMonth,
  defaultYear,
}: Props) {
  const isEdit = !!record;
  const { data: clientsRes } = useClients({ pageSize: 100, sortBy: "name", sortDir: "asc" });
  const clients = clientsRes?.data ?? [];

  const createMut = useCreateFinancial();
  const updateMut = useUpdateFinancial(record?.id ?? "");

  const [form, setForm] = useState({
    type: defaultType as FinancialType,
    category: "",
    description: "",
    amount: 0,
    clientId: "",
    dueDate: "",
    referenceMonth: defaultMonth,
    referenceYear: defaultYear,
    paymentMethod: "",
    initialPaidAmount: 0,
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (record) {
      setForm({
        type: record.type,
        category: record.category,
        description: record.description,
        amount: record.amount,
        clientId: record.clientId ?? "",
        dueDate: record.dueDate ? record.dueDate.slice(0, 10) : "",
        referenceMonth: record.referenceMonth,
        referenceYear: record.referenceYear,
        paymentMethod: record.paymentMethod ?? "",
        initialPaidAmount: 0,
        notes: record.notes ?? "",
      });
    } else {
      setForm({
        type: defaultType,
        category: "",
        description: "",
        amount: 0,
        clientId: "",
        dueDate: "",
        referenceMonth: defaultMonth,
        referenceYear: defaultYear,
        paymentMethod: "",
        initialPaidAmount: 0,
        notes: "",
      });
    }
  }, [open, record, defaultType, defaultMonth, defaultYear]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const categories = form.type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const canSubmit = form.category && form.description.trim() && form.amount > 0;
  const pending = createMut.isPending || updateMut.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const payload: Record<string, unknown> = {
      type: form.type,
      category: form.category,
      description: form.description.trim(),
      amount: form.amount,
      clientId: form.clientId || undefined,
      dueDate: form.dueDate || undefined,
      referenceMonth: form.referenceMonth,
      referenceYear: form.referenceYear,
      paymentMethod: form.paymentMethod || undefined,
      notes: form.notes || undefined,
    };
    if (!isEdit && form.initialPaidAmount > 0) payload.initialPaidAmount = form.initialPaidAmount;

    try {
      if (isEdit && record) {
        await updateMut.mutateAsync(payload);
        toast.success("Lançamento atualizado.");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Lançamento criado.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar o lançamento.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["INCOME", "EXPENSE"] as FinancialType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("type", t)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  form.type === t
                    ? t === "INCOME"
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-danger/40 bg-danger/10 text-danger"
                    : "border-line text-content-muted hover:border-line-accent"
                }`}
              >
                {t === "INCOME" ? "Receita" : "Despesa"}
              </button>
            ))}
          </div>

          <FieldGrid>
            <Field label="Categoria" required htmlFor="f-cat">
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger id="f-cat">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Valor" required htmlFor="f-amount">
              <CurrencyInput id="f-amount" value={form.amount} onValueChange={(n) => set("amount", n)} />
            </Field>
          </FieldGrid>

          <Field label="Descrição" required htmlFor="f-desc">
            <Input
              id="f-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={form.type === "INCOME" ? "Ex.: Edição campanha institucional" : "Ex.: Assinatura Adobe"}
            />
          </Field>

          <FieldGrid>
            <Field label="Cliente (opcional)" htmlFor="f-client">
              <Select value={form.clientId || "none"} onValueChange={(v) => set("clientId", v === "none" ? "" : v)}>
                <SelectTrigger id="f-client">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cliente</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Vencimento" htmlFor="f-due">
              <Input
                id="f-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </Field>
          </FieldGrid>

          <FieldGrid>
            <Field label="Competência — mês" htmlFor="f-month">
              <Select
                value={String(form.referenceMonth)}
                onValueChange={(v) => set("referenceMonth", Number(v))}
              >
                <SelectTrigger id="f-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {monthName(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Competência — ano" htmlFor="f-year">
              <Input
                id="f-year"
                type="number"
                value={form.referenceYear}
                onChange={(e) => set("referenceYear", Number(e.target.value))}
              />
            </Field>
          </FieldGrid>

          <FieldGrid>
            <Field label="Método de pagamento" htmlFor="f-method">
              <Select
                value={form.paymentMethod || "none"}
                onValueChange={(v) => set("paymentMethod", v === "none" ? "" : v)}
              >
                <SelectTrigger id="f-method">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {!isEdit && (
              <Field label="Já recebido/pago" htmlFor="f-paid" hint="Registra um pagamento inicial.">
                <CurrencyInput
                  id="f-paid"
                  value={form.initialPaidAmount}
                  onValueChange={(n) => set("initialPaidAmount", n)}
                />
              </Field>
            )}
          </FieldGrid>

          <Field label="Observações" htmlFor="f-notes">
            <Textarea
              id="f-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="min-h-[64px]"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending} disabled={!canSubmit}>
              {isEdit ? "Salvar" : "Criar lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
