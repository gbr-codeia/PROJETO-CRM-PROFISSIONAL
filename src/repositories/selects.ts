import { Prisma } from "@prisma/client";

/** Reusable Prisma select/include fragments — single source of truth for shapes. */

export const clientListInclude = {
  _count: { select: { projects: true } },
} satisfies Prisma.ClientInclude;

export const projectDefaultInclude = {
  client: { select: { id: true, name: true, companyName: true } },
  kanban: {
    include: { column: { select: { id: true, name: true, slug: true } } },
  },
} satisfies Prisma.ProjectInclude;

export const projectDetailInclude = {
  ...projectDefaultInclude,
  financialRecords: {
    orderBy: { createdAt: "desc" },
    include: {
      payments: { orderBy: { paymentDate: "asc" } },
    },
  },
} satisfies Prisma.ProjectInclude;

export const financialDefaultInclude = {
  payments: { orderBy: { paymentDate: "asc" } },
  project: { select: { id: true, title: true } },
  client: { select: { id: true, name: true } },
} satisfies Prisma.FinancialRecordInclude;

export const columnListInclude = {
  _count: { select: { cards: true } },
} satisfies Prisma.KanbanColumnInclude;
