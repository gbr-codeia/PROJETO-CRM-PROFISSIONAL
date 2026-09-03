import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { projectDefaultInclude, projectDetailInclude } from "@/repositories/selects";

export const projectRepo = {
  findForUser(userId: string, id: string) {
    return prisma.project.findFirst({
      where: { id, userId },
      include: projectDetailInclude,
    });
  },

  findRaw(userId: string, id: string) {
    return prisma.project.findFirst({ where: { id, userId } });
  },

  list(
    where: Prisma.ProjectWhereInput,
    orderBy: Prisma.ProjectOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    return prisma.$transaction([
      prisma.project.findMany({ where, orderBy, skip, take, include: projectDefaultInclude }),
      prisma.project.count({ where }),
    ]);
  },
};

export { projectDefaultInclude, projectDetailInclude };
