import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clientListInclude } from "@/repositories/selects";

export const clientRepo = {
  findByIdForUser(userId: string, id: string) {
    return prisma.client.findFirst({
      where: { id, userId },
      include: clientListInclude,
    });
  },

  list(where: Prisma.ClientWhereInput, orderBy: Prisma.ClientOrderByWithRelationInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.client.findMany({ where, orderBy, skip, take, include: clientListInclude }),
      prisma.client.count({ where }),
    ]);
  },

  create(data: Prisma.ClientUncheckedCreateInput) {
    return prisma.client.create({ data, include: clientListInclude });
  },

  update(id: string, userId: string, data: Prisma.ClientUpdateInput) {
    return prisma.client.update({ where: { id, userId }, data, include: clientListInclude });
  },

  delete(id: string, userId: string) {
    return prisma.client.delete({ where: { id, userId } });
  },

  countProjects(clientId: string) {
    return prisma.project.count({ where: { clientId } });
  },
};
