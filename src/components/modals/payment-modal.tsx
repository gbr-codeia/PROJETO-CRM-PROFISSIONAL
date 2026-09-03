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
import { useAddPayment } from "@/hooks/queries";
import { PAYMENT_METHODS } from "@/lib/domain";
import { formatBRL } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { FinancialRecord } from "@/lib/api-types";

export function PaymentModal({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  record: Pick<FinancialRecord, "id" | "description" | "remainingAmount" | "amount" | "paidAmount"> | null;
}) {
  const addMut = useAddPayment(record?.id ?? "");
  const remaining = record?.remainingAmount ?? 0;

  const [form, setForm] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "PIX",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        amount: Number(remaining.toFixed(2)),
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod: "PIX",
        notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record?.id]);

  const over = form.amount > remaining + 0.005;
  const canSubmit = form.amount > 0 && !!record;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!record || !canSubmit) return;
    try {
      const updated = await addMut.mutateAsync({
        amount: form.amount,
        paymentDate: form.paymentDate || undefined,
        paymentMethod: form.paymentMethod || undefined,
        notes: form.notes || undefined,
        allowOverpay: over,
      });
      toast.success(
        updated.status === "PAID"
          ? "Pagamento registrado. Lançamento quitado."
          : "Pagamento parcial registrado.",
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao registrar pagamento.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
        </DialogHeader>

        {record && (
          <div className="rounded-xl border border-line bg-surface-raised p-3 text-sm">
            <p className="truncate font-medium text-content">{record.description}</p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-muted">
              <span>Total {formatBRL(record.amount)}</span>
              <span>Recebido {formatBRL(record.paidAmount)}</span>
              <span className="text-primary">Saldo {formatBRL(remaining)}</span>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <FieldGrid>
            <Field
              label="Valor"
              htmlFor="pay-amount"
              required
              error={over ? "Acima do saldo — será registrado como pagamento extra." : undefined}
            >
              <CurrencyInput
                id="pay-amount"
                value={form.amount}
                onValueChange={(n) => setForm((f) => ({ ...f, amount: n }))}
              />
            </Field>
            <Field label="Data" htmlFor="pay-date">
              <Input
                id="pay-date"
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
              />
            </Field>
          </FieldGrid>

          <Field label="Método de pagamento" htmlFor="pay-method">
            <Select
              value={form.paymentMethod}
              onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}
            >
              <SelectTrigger id="pay-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Observações" htmlFor="pay-notes">
            <Textarea
              id="pay-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="min-h-[64px]"
              placeholder="Ex.: entrada 50%, nota fiscal enviada…"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={addMut.isPending} disabled={!canSubmit}>
              Registrar pagamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
