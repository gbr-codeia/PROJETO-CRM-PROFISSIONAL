import { Prisma, ProjectStatus, type Project } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { projectRepo } from "@/repositories/project.repository";
import { kanbanRepo } from "@/repositories/kanban.repository";
import { kanbanService } from "@/services/kanban.service";
import { clientService } from "@/services/client.service";
import { projectDetailInclude } from "@/repositories/selects";
import { serializeProject } from "@/lib/serialize";
import { paginate, toSkipTake } from "@/lib/pagination";
import { NotFoundError } from "@/lib/errors";
import { logActivity } from "@/services/activity.service";
import {
  onProjectCancelled,
  onProjectDelivered,
  onProjectReopened,
  onProjectValueChanged,
} from "@/services/automation.service";
import { startOfMonth, startOfNextMonth } from "@/utils/date";
import type {
  CreateProjectInput,
  ListProjectsQuery,
  MoveProjectInput,
  UpdateProjectInput,
} from "@/schemas/project.schema";

type Tx = Prisma.TransactionClient;

/** Rebuild dense 0..n-1 positions for a column, inserting `projectId` at `desiredPos`. */
async function placeCard(
  tx: Tx,
  projectId: string,
  targetColumnId: string,
  desiredPos?: number,
) {
  const current = await tx.projectKanban.findUnique({ where: { projectId } });

  // Close the gap in the previous column.
  if (current && current.columnId !== targetColumnId) {
    const olds = await tx.projectKanban.findMany({
      where: { columnId: current.columnId, NOT: { projectId } },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (let i = 0; i < olds.length; i++) {
      await tx.projectKanban.update({ where: { id: olds[i].id }, data: { position: i } });
    }
  }

  const siblings = await tx.projectKanban.findMany({
    where: { columnId: targetColumnId, NOT: { projectId } },
    orderBy: { position: "asc" },
    select: { projectId: true },
  });

  const insertAt = Math.max(0, Math.min(desiredPos ?? siblings.length, siblings.length));
  const ordered = [
    ...siblings.slice(0, insertAt).map((s) => s.projectId),
    projectId,
    ...siblings.slice(insertAt).map((s) => s.projectId),
  ];

  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i] === projectId) {
      await tx.projectKanban.upsert({
        where: { projectId },
        create: { projectId, columnId: targetColumnId, position: i },
        update: { columnId: targetColumnId, position: i },
      });
    } else {
      await tx.projectKanban.update({
        where: { projectId: ordered[i] },
        data: { position: i },
      });
    }
  }
}

function buildProjectWhere(userId: string, q: ListProjectsQuery): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = { userId };

  if (q.status) where.status = Array.isArray(q.status) ? { in: q.status } : q.status;
  if (q.priority) where.priority = Array.isArray(q.priority) ? { in: q.priority } : q.priority;
  if (q.paymentStatus)
    where.paymentStatus = Array.isArray(q.paymentStatus)
      ? { in: q.paymentStatus }
      : q.paymentStatus;
  if (q.clientId) where.clientId = q.clientId;
  if (q.columnId) where.kanban = { columnId: q.columnId };

  if (q.from || q.to) {
    where.entryDate = {};
    if (q.from) where.entryDate.gte = q.from;
    if (q.to) where.entryDate.lte = q.to;
  } else if (q.month && q.year) {
    where.entryDate = {
      gte: startOfMonth({ month: q.month, year: q.year }),
      lt: startOfNextMonth({ month: q.month, year: q.year }),
    };
  }

  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: "insensitive" } },
      { description: { contains: q.search, mode: "insensitive" } },
      { client: { name: { contains: q.search, mode: "insensitive" } } },
    ];
  }

  return where;
}

export const projectService = {
  async list(userId: string, query: ListProjectsQuery) {
    const { page, pageSize, sortBy, sortDir } = query;
    const where = buildProjectWhere(userId, query);
    const { skip, take } = toSkipTake({ page, pageSize });
    const [rows, total] = await projectRepo.list(where, { [sortBy]: sortDir }, skip, take);
    return paginate(rows.map(serializeProject), total, { page, pageSize });
  },

  async get(userId: string, id: string) {
    const row = await projectRepo.findForUser(userId, id);
    if (!row) throw new NotFoundError("Projeto");
    return serializeProject(row);
  },

  async create(userId: string, input: CreateProjectInput) {
    await clientService.assertOwned(userId, input.clientId);
    await kanbanService.ensureDefaultColumns(userId);

    const columns = await kanbanRepo.listColumns(userId);
    let targetColumn = columns[0];
    if (input.columnId) {
      const found = columns.find((c) => c.id === input.columnId);
      if (!found) throw new NotFoundError("Coluna");
      targetColumn = found;
    }

    const created = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          userId,
          clientId: input.clientId,
          title: input.title,
          description: input.description,
          projectType: input.projectType,
          value: new Prisma.Decimal(input.value ?? 0),
          entryDate: input.entryDate ?? new Date(),
          deadline: input.deadline,
          status: input.status ?? ProjectStatus.NEW,
          priority: input.priority,
          paymentStatus: input.paymentStatus,
          paymentMethod: input.paymentMethod,
          color: input.color,
          notes: input.notes,
        },
      });

      if (targetColumn) {
        await placeCard(tx, project.id, targetColumn.id);
      }

      await logActivity(
        {
          userId,
          projectId: project.id,
          action: "PROJECT_CREATED",
          description: `Projeto "${project.title}" criado`,
          metadata: { clientId: project.clientId, columnId: targetColumn?.id ?? null },
        },
        tx,
      );

      // Direct-to-delivered creation, or dropped straight into the delivered column.
      const deliveredByColumn = targetColumn?.isDeliveredColumn ?? false;
      if (project.status === ProjectStatus.DELIVERED || deliveredByColumn) {
        await onProjectDelivered(tx, project, {
          reason: deliveredByColumn ? "kanban" : "status",
        });
      }

      return tx.project.findUniqueOrThrow({ where: { id: project.id }, include: projectDetailInclude });
    });

    return serializeProject(created);
  },

  async update(userId: string, id: string, input: UpdateProjectInput) {
    const current = await projectRepo.findRaw(userId, id);
    if (!current) throw new NotFoundError("Projeto");

    if (input.clientId && input.clientId !== current.clientId) {
      await clientService.assertOwned(userId, input.clientId);
    }

    const scalar: Prisma.ProjectUpdateInput = {};
    if (input.clientId !== undefined) scalar.client = { connect: { id: input.clientId } };
    if (input.title !== undefined) scalar.title = input.title;
    if (input.description !== undefined) scalar.description = input.description ?? null;
    if (input.projectType !== undefined) scalar.projectType = input.projectType ?? null;
    if (input.value !== undefined) scalar.value = new Prisma.Decimal(input.value);
    if (input.entryDate !== undefined) scalar.entryDate = input.entryDate;
    if (input.deadline !== undefined) scalar.deadline = input.deadline ?? null;
    if (input.paymentMethod !== undefined) scalar.paymentMethod = input.paymentMethod ?? null;
    if (input.color !== undefined) scalar.color = input.color ?? null;
    if (input.notes !== undefined) scalar.notes = input.notes ?? null;
    if (input.priority !== undefined) scalar.priority = input.priority;
    if (input.paymentStatus !== undefined) scalar.paymentStatus = input.paymentStatus;
    if (input.deliveredAt !== undefined) scalar.deliveredAt = input.deliveredAt ?? null;
    if (input.completedAt !== undefined) scalar.completedAt = input.completedAt ?? null;

    const targetStatus = input.status;
    const valueChanged =
      input.value !== undefined && !new Prisma.Decimal(input.value).eq(current.value);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id }, data: scalar });
      const after = await tx.project.findUniqueOrThrow({ where: { id } });

      if (targetStatus && targetStatus !== current.status) {
        if (targetStatus === ProjectStatus.DELIVERED) {
          await onProjectDelivered(tx, after, { reason: "status" });
        } else if (current.status === ProjectStatus.DELIVERED) {
          await onProjectReopened(tx, after, targetStatus);
        } else if (targetStatus === ProjectStatus.CANCELLED) {
          await onProjectCancelled(tx, after, input.financialPolicy ?? "keep");
        } else {
          await tx.project.update({ where: { id }, data: { status: targetStatus } });
        }
      } else if (valueChanged) {
        await onProjectValueChanged(tx, after);
      }

      await logActivity(
        {
          userId,
          projectId: id,
          action: "PROJECT_UPDATED",
          description: `Projeto "${after.title}" atualizado`,
          metadata: { changes: sanitizeChanges(input) },
        },
        tx,
      );

      return tx.project.findUniqueOrThrow({ where: { id }, include: projectDetailInclude });
    });

    return serializeProject(updated);
  },

  async move(userId: string, id: string, input: MoveProjectInput) {
    const project = await projectRepo.findRaw(userId, id);
    if (!project) throw new NotFoundError("Projeto");

    const targetColumn = await kanbanRepo.findColumn(userId, input.columnId);
    if (!targetColumn) throw new NotFoundError("Coluna");

    const result = await prisma.$transaction(async (tx) => {
      const prevCard = await tx.projectKanban.findUnique({
        where: { projectId: id },
        include: { column: { select: { id: true, name: true, isDeliveredColumn: true } } },
      });

      await placeCard(tx, id, targetColumn.id, input.position);

      const fromDelivered = prevCard?.column?.isDeliveredColumn ?? false;
      const toDelivered = targetColumn.isDeliveredColumn;

      if (toDelivered && project.status !== ProjectStatus.DELIVERED) {
        await onProjectDelivered(tx, project, { reason: "kanban" });
      } else if (
        fromDelivered &&
        !toDelivered &&
        project.status === ProjectStatus.DELIVERED
      ) {
        await onProjectReopened(tx, project, ProjectStatus.EDITING);
      }

      await logActivity(
        {
          userId,
          projectId: id,
          action: "PROJECT_MOVED",
          description: `Projeto "${project.title}" movido para "${targetColumn.name}"`,
          metadata: {
            fromColumnId: prevCard?.columnId ?? null,
            fromColumnName: prevCard?.column?.name ?? null,
            toColumnId: targetColumn.id,
            toColumnName: targetColumn.name,
          },
        },
        tx,
      );

      return tx.project.findUniqueOrThrow({ where: { id }, include: projectDetailInclude });
    });

    return serializeProject(result);
  },

  async remove(userId: string, id: string, financial: "keep" | "cancel") {
    const project = await projectRepo.findRaw(userId, id);
    if (!project) throw new NotFoundError("Projeto");

    await prisma.$transaction(async (tx) => {
      if (financial === "cancel") {
        await tx.financialRecord.updateMany({
          where: { projectId: id, status: { in: ["PENDING", "PARTIAL"] } },
          data: { status: "CANCELLED" },
        });
      }
      // Keep financial history: detach records instead of cascading delete.
      await tx.financialRecord.updateMany({
        where: { projectId: id },
        data: { projectId: null, autoSourceProjectId: null },
      });
      await tx.project.delete({ where: { id } });

      await logActivity(
        {
          userId,
          action: "PROJECT_DELETED",
          description: `Projeto "${project.title}" removido`,
          metadata: { projectId: id, financialPolicy: financial },
        },
        tx,
      );
    });

    return { id };
  },

  async assertOwned(userId: string, id: string): Promise<Project> {
    const row = await projectRepo.findRaw(userId, id);
    if (!row) throw new NotFoundError("Projeto");
    return row;
  },
};

function sanitizeChanges(input: UpdateProjectInput) {
  const { financialPolicy, ...rest } = input;
  void financialPolicy;
  return rest;
}

/** exported for tests / reuse */
export { placeCard, buildProjectWhere };
