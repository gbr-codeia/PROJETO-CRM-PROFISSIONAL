import { FinancialStatus, PaymentStatus, Prisma } from "@prisma/client";

/**
 * Pure business rules shared by the financial, payment and automation services.
 */

/** Derive a financial record status from its amount vs. total paid. */
export function deriveFinancialStatus(
  amount: Prisma.Decimal | number | string,
  paidAmount: Prisma.Decimal | number | string,
  current: FinancialStatus,
): FinancialStatus {
  // A cancelled record stays cancelled unless explicitly reactivated elsewhere.
  if (current === FinancialStatus.CANCELLED) return FinancialStatus.CANCELLED;

  const amt = new Prisma.Decimal(amount);
  const paid = new Prisma.Decimal(paidAmount);

  if (paid.lte(0)) return FinancialStatus.PENDING;
  if (paid.gte(amt)) return FinancialStatus.PAID;
  return FinancialStatus.PARTIAL;
}

/** Map a financial status onto the coarser project payment status. */
export function financialToPaymentStatus(status: FinancialStatus): PaymentStatus {
  switch (status) {
    case FinancialStatus.PAID:
      return PaymentStatus.PAID;
    case FinancialStatus.PARTIAL:
      return PaymentStatus.PARTIAL;
    default:
      return PaymentStatus.PENDING;
  }
}

/** Map a project payment status onto an initial financial status. */
export function paymentToFinancialStatus(status: PaymentStatus): FinancialStatus {
  switch (status) {
    case PaymentStatus.PAID:
      return FinancialStatus.PAID;
    case PaymentStatus.PARTIAL:
      return FinancialStatus.PARTIAL;
    default:
      return FinancialStatus.PENDING;
  }
}

/** Category inferred from the free-text project type. */
export function inferIncomeCategory(projectType?: string | null): string {
  const t = (projectType ?? "").toLowerCase();
  if (/film|grava/.test(t)) return "Filmagem";
  if (/foto/.test(t)) return "Fotografia";
  if (/especial|special/.test(t)) return "Projeto Especial";
  if (t && !/edi[cç][aã]o|video|vídeo/.test(t)) return "Outros";
  return "Edição de Vídeo";
}
