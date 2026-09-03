import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/utils/money";
import { toCsv, type CsvColumn } from "@/utils/csv";
import { startOfMonth, startOfNextMonth, monthLabel } from "@/utils/date";
import type { MonthlyReportQuery, ExportQuery } from "@/schemas/report.schema";

export interface MonthlyReportRow {
  projectId: string;
  projectTitle: string;
  clientId: string;
  clientName: string;
  value: number;
  received: number;
  pending: number;
  paymentStatus: string;
  deliveredAt: Date | null;
}

export interface MonthlyReport {
  period: { month: number; year: number; label: string };
  rows: MonthlyReportRow[];
  summary: {
    grossRevenue: number;
    totalReceived: number;
    totalPending: number;
    averageTicket: number;
    jobsCount: number;
  };
}

/**
 * Monthly report: every project delivered inside the reference month, with the
 * money that project has brought in so far.
 */
export const reportService = {
  async monthly(userId: string, q: MonthlyReportQuery): Promise<MonthlyReport> {
    const range = {
      gte: startOfMonth({ month: q.month, year: q.year }),
      lt: startOfNextMonth({ month: q.month, year: q.year }),
    };

    const projects = await prisma.project.findMany({
      where: {
        userId,
        deliveredAt: range,
        status: { not: "CANCELLED" },
        ...(q.clientId ? { clientId: q.clientId } : {}),
      },
      orderBy: { deliveredAt: "asc" },
      include: {
        client: { select: { id: true, name: true } },
        financialRecords: {
          where: { type: "INCOME", status: { not: "CANCELLED" } },
          select: { amount: true, paidAmount: true },
        },
      },
    });

    const rows: MonthlyReportRow[] = projects.map((p) => {
      const recAmount = p.financialRecords.reduce(
        (acc, r) => acc.plus(r.amount),
        new Prisma.Decimal(0),
      );
      const recPaid = p.financialRecords.reduce(
        (acc, r) => acc.plus(r.paidAmount),
        new Prisma.Decimal(0),
      );
      // Fall back to the project value when no financial record exists yet.
      const value = recAmount.gt(0) ? toNumber(recAmount) : toNumber(p.value);
      const received = toNumber(recPaid);
      return {
        projectId: p.id,
        projectTitle: p.title,
        clientId: p.clientId,
        clientName: p.client.name,
        value,
        received,
        pending: Math.max(0, Number((value - received).toFixed(2))),
        paymentStatus: p.paymentStatus,
        deliveredAt: p.deliveredAt,
      };
    });

    const grossRevenue = round(rows.reduce((s, r) => s + r.value, 0));
    const totalReceived = round(rows.reduce((s, r) => s + r.received, 0));
    const totalPending = round(rows.reduce((s, r) => s + r.pending, 0));

    return {
      period: { month: q.month, year: q.year, label: monthLabel({ month: q.month, year: q.year }) },
      rows,
      summary: {
        grossRevenue,
        totalReceived,
        totalPending,
        averageTicket: rows.length ? round(grossRevenue / rows.length) : 0,
        jobsCount: rows.length,
      },
    };
  },

  /**
   * CSV export of financial records for a period. Architecture note: the shape
   * below (rows + column descriptors) is format-agnostic — an XLSX or PDF
   * exporter can consume the same `buildExportRows` output.
   */
  async exportCsv(userId: string, q: ExportQuery): Promise<{ filename: string; content: string }> {
    const rows = await buildExportRows(userId, q);

    const columns: CsvColumn<ExportRow>[] = [
      { header: "Data", value: (r) => r.date },
      { header: "Cliente", value: (r) => r.client },
      { header: "Projeto", value: (r) => r.project },
      { header: "Categoria", value: (r) => r.category },
      { header: "Tipo", value: (r) => r.type },
      { header: "Valor Total", value: (r) => r.total.toFixed(2) },
      { header: "Valor Recebido", value: (r) => r.received.toFixed(2) },
      { header: "Valor Pendente", value: (r) => r.pending.toFixed(2) },
      { header: "Status", value: (r) => r.status },
    ];

    const content = toCsv(rows, columns, { bom: true });
    const scope =
      q.month && q.year
        ? `${q.year}-${String(q.month).padStart(2, "0")}`
        : q.from || q.to
          ? `${q.from?.toISOString().slice(0, 10) ?? "inicio"}_${q.to?.toISOString().slice(0, 10) ?? "fim"}`
          : "completo";

    return { filename: `editflow-financeiro-${scope}.csv`, content };
  },
};

interface ExportRow {
  date: string;
  client: string;
  project: string;
  category: string;
  type: string;
  total: number;
  received: number;
  pending: number;
  status: string;
}

async function buildExportRows(userId: string, q: ExportQuery): Promise<ExportRow[]> {
  const where: Prisma.FinancialRecordWhereInput = { userId };
  if (q.type) where.type = q.type;
  if (q.clientId) where.clientId = q.clientId;
  if (q.month && q.year) {
    where.referenceMonth = q.month;
    where.referenceYear = q.year;
  } else if (q.from || q.to) {
    where.createdAt = {
      ...(q.from ? { gte: q.from } : {}),
      ...(q.to ? { lte: q.to } : {}),
    };
  }

  const records = await prisma.financialRecord.findMany({
    where,
    orderBy: [{ referenceYear: "asc" }, { referenceMonth: "asc" }, { createdAt: "asc" }],
    include: {
      client: { select: { name: true } },
      project: { select: { title: true } },
    },
  });

  return records.map((r) => {
    const total = toNumber(r.amount);
    const received = toNumber(r.paidAmount);
    return {
      date: (r.dueDate ?? r.paidAt ?? r.createdAt).toISOString().slice(0, 10),
      client: r.client?.name ?? "-",
      project: r.project?.title ?? "-",
      category: r.category,
      type: r.type,
      total,
      received,
      pending: Math.max(0, Number((total - received).toFixed(2))),
      status: r.status,
    };
  });
}

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
