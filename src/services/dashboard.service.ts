import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/utils/money";
import {
  lastNMonths,
  monthKey,
  monthLabel,
  nowRef,
  startOfMonth,
  startOfNextMonth,
  type MonthRef,
} from "@/utils/date";
import type { DashboardSummary } from "@/types";

const ACTIVE_PROJECT_STATUSES: Prisma.ProjectWhereInput["status"] = {
  notIn: ["DELIVERED", "CANCELLED"],
};

interface MonthBucket {
  key: string;
  label: string;
  month: number;
  year: number;
  incomeForecast: number;
  incomeReceived: number;
  incomePending: number;
  expenseTotal: number;
  expensePaid: number;
  net: number;
}

async function monthBuckets(userId: string, refs: MonthRef[]): Promise<MonthBucket[]> {
  const grouped = await prisma.financialRecord.groupBy({
    by: ["referenceYear", "referenceMonth", "type"],
    where: {
      userId,
      status: { not: "CANCELLED" },
      OR: refs.map((r) => ({ referenceYear: r.year, referenceMonth: r.month })),
    },
    _sum: { amount: true, paidAmount: true },
  });

  const index = new Map<string, { forecast: number; received: number; type: string }[]>();
  for (const g of grouped) {
    const key = monthKey({ month: g.referenceMonth, year: g.referenceYear });
    const arr = index.get(key) ?? [];
    arr.push({
      forecast: toNumber(g._sum.amount),
      received: toNumber(g._sum.paidAmount),
      type: g.type,
    });
    index.set(key, arr);
  }

  return refs.map((r) => {
    const key = monthKey(r);
    const rows = index.get(key) ?? [];
    const income = rows.find((x) => x.type === "INCOME");
    const expense = rows.find((x) => x.type === "EXPENSE");

    const incomeForecast = income?.forecast ?? 0;
    const incomeReceived = income?.received ?? 0;
    const expenseTotal = expense?.forecast ?? 0;
    const expensePaid = expense?.received ?? 0;

    return {
      key,
      label: monthLabel(r),
      month: r.month,
      year: r.year,
      incomeForecast,
      incomeReceived,
      incomePending: Math.max(0, Number((incomeForecast - incomeReceived).toFixed(2))),
      expenseTotal,
      expensePaid,
      net: Number((incomeReceived - expensePaid).toFixed(2)),
    };
  });
}

export const dashboardService = {
  async summary(userId: string, ref: MonthRef = nowRef()): Promise<DashboardSummary> {
    const monthRange = { gte: startOfMonth(ref), lt: startOfNextMonth(ref) };
    const financialWhere: Prisma.FinancialRecordWhereInput = {
      userId,
      referenceMonth: ref.month,
      referenceYear: ref.year,
      status: { not: "CANCELLED" },
    };

    const [income, expense, deliveredCount, monthProjects, activeCount, cancelledCount, incomeCount] =
      await Promise.all([
        prisma.financialRecord.aggregate({
          where: { ...financialWhere, type: "INCOME" },
          _sum: { amount: true, paidAmount: true },
        }),
        prisma.financialRecord.aggregate({
          where: { ...financialWhere, type: "EXPENSE" },
          _sum: { amount: true, paidAmount: true },
        }),
        prisma.project.count({ where: { userId, deliveredAt: monthRange } }),
        prisma.project.count({ where: { userId, entryDate: monthRange } }),
        prisma.project.count({ where: { userId, status: ACTIVE_PROJECT_STATUSES } }),
        prisma.project.count({
          where: { userId, status: "CANCELLED", entryDate: monthRange },
        }),
        prisma.financialRecord.count({ where: { ...financialWhere, type: "INCOME" } }),
      ]);

    const forecast = toNumber(income._sum.amount);
    const received = toNumber(income._sum.paidAmount);
    const expenseTotal = toNumber(expense._sum.amount);
    const expensePaid = toNumber(expense._sum.paidAmount);

    return {
      period: ref,
      revenue: {
        forecast,
        received,
        pending: Math.max(0, Number((forecast - received).toFixed(2))),
      },
      expenses: {
        total: expenseTotal,
        paid: expensePaid,
        pending: Math.max(0, Number((expenseTotal - expensePaid).toFixed(2))),
      },
      netProfit: Number((received - expensePaid).toFixed(2)),
      projectedNetProfit: Number((forecast - expenseTotal).toFixed(2)),
      projects: {
        total: monthProjects,
        delivered: deliveredCount,
        inProgress: activeCount,
        cancelled: cancelledCount,
      },
      averageTicket: incomeCount > 0 ? Number((forecast / incomeCount).toFixed(2)) : 0,
    };
  },

  /** Chart-ready payloads (Recharts / Chart.js friendly). */
  async charts(userId: string, opts: { months: number; end?: MonthRef } = { months: 6 }) {
    const refs = lastNMonths(opts.months, opts.end ?? nowRef());
    const buckets = await monthBuckets(userId, refs);

    // 1. Faturamento mensal
    const monthlyRevenue = buckets.map((b) => ({
      key: b.key,
      label: b.label,
      forecast: b.incomeForecast,
      received: b.incomeReceived,
      pending: b.incomePending,
    }));

    // 2. Receitas vs despesas
    const incomeVsExpense = buckets.map((b) => ({
      key: b.key,
      label: b.label,
      income: b.incomeReceived,
      expense: b.expensePaid,
      net: b.net,
    }));

    // 3. Projetos por status (snapshot atual)
    const grouped = await prisma.project.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
      _sum: { value: true },
    });
    const projectsByStatus = grouped.map((g) => ({
      status: g.status,
      count: g._count._all,
      value: toNumber(g._sum.value),
    }));

    // 4. Evolução financeira (acumulado)
    let cumForecast = 0;
    let cumReceived = 0;
    const financialEvolution = buckets.map((b) => {
      cumForecast = Number((cumForecast + b.incomeForecast).toFixed(2));
      cumReceived = Number((cumReceived + b.incomeReceived).toFixed(2));
      return {
        key: b.key,
        label: b.label,
        cumulativeForecast: cumForecast,
        cumulativeReceived: cumReceived,
        monthlyNet: b.net,
      };
    });

    // 5. Comparação entre meses (último vs penúltimo)
    const currentB = buckets[buckets.length - 1];
    const prevB = buckets[buckets.length - 2];
    const delta = (cur: number, prev: number) => ({
      current: cur,
      previous: prev,
      change: Number((cur - prev).toFixed(2)),
      changePct: prev === 0 ? null : Number((((cur - prev) / prev) * 100).toFixed(1)),
    });
    const monthComparison = currentB
      ? {
          current: { key: currentB.key, label: currentB.label },
          previous: prevB ? { key: prevB.key, label: prevB.label } : null,
          revenue: delta(currentB.incomeForecast, prevB?.incomeForecast ?? 0),
          received: delta(currentB.incomeReceived, prevB?.incomeReceived ?? 0),
          expenses: delta(currentB.expenseTotal, prevB?.expenseTotal ?? 0),
          net: delta(currentB.net, prevB?.net ?? 0),
        }
      : null;

    return {
      range: { from: refs[0], to: refs[refs.length - 1], months: opts.months },
      monthlyRevenue,
      incomeVsExpense,
      projectsByStatus,
      financialEvolution,
      monthComparison,
    };
  },
};
