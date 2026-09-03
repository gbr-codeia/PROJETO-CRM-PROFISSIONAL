import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { columnListInclude } from "@/repositories/selects";

type Db = PrismaClient | Prisma.TransactionClient;

export const kanbanRepo = {
  listColumns(userId: string, db: Db = prisma) {
    return db.kanbanColumn.findMany({
      where: { userId },
      orderBy: { position: "asc" },
      include: columnListInclude,
    });
  },

  findColumn(userId: string, id: string, db: Db = prisma) {
    return db.kanbanColumn.findFirst({ where: { id, userId } });
  },

  findColumnBySlug(userId: string, slug: string, db: Db = prisma) {
    return db.kanbanColumn.findUnique({ where: { userId_slug: { userId, slug } } });
  },

  findDeliveredColumn(userId: string, db: Db = prisma) {
    return db.kanbanColumn.findFirst({
      where: { userId, isDeliveredColumn: true },
      orderBy: { position: "asc" },
    });
  },

  countColumns(userId: string, db: Db = prisma) {
    return db.kanbanColumn.count({ where: { userId } });
  },

  maxColumnPosition(userId: string, db: Db = prisma) {
    return db.kanbanColumn.aggregate({ where: { userId }, _max: { position: true } });
  },

  card(projectId: string, db: Db = prisma) {
    return db.projectKanban.findUnique({
      where: { projectId },
      include: { column: { select: { id: true, name: true, slug: true, isDeliveredColumn: true } } },
    });
  },

  maxCardPosition(columnId: string, db: Db = prisma) {
    return db.projectKanban.aggregate({ where: { columnId }, _max: { position: true } });
  },
};
