import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { financialRepo } from "@/repositories/financial.repository";
import { financialDefaultInclude } from "@/repositories/selects";
import { serializeFinancial, serializePayment } from "@/lib/serialize";
import { NotFoundError, UnprocessableError } from "@/lib/errors";
import { logActivity } from "@/services/activity.service";
import { recomputeFinancialRecord } from "@/services/financial.service";
import type { CreatePaymentInput } from "@/schemas/payment.schema";

export const paymentService = {
  async list(userId: string, financialRecordId: string) {
    const record = await financialRepo.findForUser(userId, financialRecordId);
    if (!record) throw new NotFoundError("Lançamento financeiro");
    return record.payments.map(serializePayment);
  },

  /**
   * Register a (partial) payment. Recomputes paidAmount / remaining / status
   * on the parent record and syncs the linked project's paymentStatus.
   */
  async create(userId: string, financialRecordId: string, input: CreatePaymentInput) {
    const record = await financialRepo.findRaw(userId, financialRecordId);
    if (!record) throw new NotFoundError("Lançamento financeiro");
    if (record.status === "CANCELLED") {
      throw new UnprocessableError("Não é possível registrar pagamento em um lançamento cancelado.");
    }

    const amount = new Prisma.Decimal(input.amount);
    const alreadyPaid = new Prisma.Decimal(record.paidAmount);
    const total = new Prisma.Decimal(record.amount);
    const remaining = total.minus(alreadyPaid);

    if (!input.allowOverpay && amount.gt(remaining)) {
      throw new UnprocessableError(
        `O pagamento excede o saldo restante (${remaining.toFixed(2)}).`,
        { remaining: Number(remaining.toFixed(2)), amount: Number(amount.toFixed(2)) },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          financialRecordId,
          amount,
          paymentDate: input.paymentDate ?? new Date(),
          paymentMethod: input.paymentMethod ?? null,
          notes: input.notes ?? null,
        },
      });

      const updatedRecord = await recomputeFinancialRecord(financialRecordId, tx);

      await logActivity(
        {
          userId,
          projectId: record.projectId,
          action: "PAYMENT_REGISTERED",
          description: `Pagamento de ${amount.toFixed(2)} registrado em "${record.description}"`,
          metadata: {
            financialRecordId,
            paymentId: payment.id,
            newStatus: updatedRecord.status,
            paidAmount: updatedRecord.paidAmount.toString(),
          },
        },
        tx,
      );

      return tx.financialRecord.findUniqueOrThrow({
        where: { id: financialRecordId },
        include: financialDefaultInclude,
      });
    });

    return serializeFinancial(result);
  },

  async remove(userId: string, financialRecordId: string, paymentId: string) {
    const record = await financialRepo.findRaw(userId, financialRecordId);
    if (!record) throw new NotFoundError("Lançamento financeiro");

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, financialRecordId },
    });
    if (!payment) throw new NotFoundError("Pagamento");

    const result = await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: paymentId } });
      const updatedRecord = await recomputeFinancialRecord(financialRecordId, tx);

      await logActivity(
        {
          userId,
          projectId: record.projectId,
          action: "PAYMENT_DELETED",
          description: `Pagamento removido de "${record.description}"`,
          metadata: { financialRecordId, paymentId, newStatus: updatedRecord.status },
        },
        tx,
      );

      return tx.financialRecord.findUniqueOrThrow({
        where: { id: financialRecordId },
        include: financialDefaultInclude,
      });
    });

    return serializeFinancial(result);
  },
};
