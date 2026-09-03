import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { financialDefaultInclude } from "@/repositories/selects";

export const financialRepo = {
  findForUser(userId: string, id: string) {
    return prisma.financialRecord.findFirst({
      where: { id, userId },
      include: financialDefaultInclude,
    });
  },

  findRaw(userId: string, id: string) {
    return prisma.financialRecord.findFirst({ where: { id, userId } });
  },

  list(
    where: Prisma.FinancialRecordWhereInput,
    orderBy: Prisma.FinancialRecordOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    return prisma.$transaction([
      prisma.financialRecord.findMany({
        where,
        orderBy,
        skip,
        take,
        include: financialDefaultInclude,
      }),
      prisma.financialRecord.count({ where }),
    ]);
  },
};
