import type { ActivityAction, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeActivity } from "@/lib/serialize";
import { paginate, toSkipTake } from "@/lib/pagination";

type Db = PrismaClient | Prisma.TransactionClient;

export interface LogActivityInput {
  userId: string;
  action: ActivityAction;
  description: string;
  projectId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Append an entry to the activity history. Accepts an optional transaction
 * client so it participates in the same transaction as the mutation it records.
 */
export async function logActivity(input: LogActivityInput, db: Db = prisma) {
  return db.activity.create({
    data: {
      userId: input.userId,
      action: input.action,
      description: input.description,
      projectId: input.projectId ?? null,
      metadata: input.metadata,
    },
  });
}

export async function listActivities(
  userId: string,
  opts: { page?: number; pageSize?: number; projectId?: string } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 30;
  const where: Prisma.ActivityWhereInput = {
    userId,
    ...(opts.projectId ? { projectId: opts.projectId } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake({ page, pageSize }),
    }),
    prisma.activity.count({ where }),
  ]);

  return paginate(rows.map(serializeActivity), total, { page, pageSize });
}
