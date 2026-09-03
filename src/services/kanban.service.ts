import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kanbanRepo } from "@/repositories/kanban.repository";
import { columnListInclude } from "@/repositories/selects";
import { serializeColumn } from "@/lib/serialize";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { logActivity } from "@/services/activity.service";
import { slugify, uniqueSlug } from "@/utils/slug";
import type {
  CreateColumnInput,
  ReorderColumnsInput,
  UpdateColumnInput,
} from "@/schemas/kanban.schema";

type Db = PrismaClient | Prisma.TransactionClient;

export const DEFAULT_COLUMNS: Array<{
  name: string;
  slug: string;
  color: string;
  isDeliveredColumn: boolean;
}> = [
  { name: "Novos Projetos", slug: "novos-projetos", color: "#64748b", isDeliveredColumn: false },
  { name: "Aguardando Material", slug: "aguardando-material", color: "#f59e0b", isDeliveredColumn: false },
  { name: "Em Edição", slug: "em-edicao", color: "#3b82f6", isDeliveredColumn: false },
  { name: "Revisão", slug: "revisao", color: "#a855f7", isDeliveredColumn: false },
  { name: "Ajustes", slug: "ajustes", color: "#ef4444", isDeliveredColumn: false },
  { name: "Entregue", slug: "entregue", color: "#22e0a1", isDeliveredColumn: true },
];

export const kanbanService = {
  /** Idempotently create the default board for a user that has no columns yet. */
  async ensureDefaultColumns(userId: string, db: Db = prisma) {
    const existing = await kanbanRepo.countColumns(userId, db);
    if (existing > 0) return;

    await db.kanbanColumn.createMany({
      data: DEFAULT_COLUMNS.map((c, index) => ({
        userId,
        name: c.name,
        slug: c.slug,
        color: c.color,
        position: index,
        isDeliveredColumn: c.isDeliveredColumn,
        isDefault: true,
      })),
      skipDuplicates: true,
    });
  },

  async listColumns(userId: string) {
    await kanbanService.ensureDefaultColumns(userId);
    const rows = await kanbanRepo.listColumns(userId);
    return rows.map(serializeColumn);
  },

  async getColumn(userId: string, id: string) {
    const row = await prisma.kanbanColumn.findFirst({
      where: { id, userId },
      include: columnListInclude,
    });
    if (!row) throw new NotFoundError("Coluna");
    return serializeColumn(row);
  },

  async createColumn(userId: string, input: CreateColumnInput) {
    await kanbanService.ensureDefaultColumns(userId);

    const columns = await kanbanRepo.listColumns(userId);
    const taken = new Set(columns.map((c) => c.slug));
    const slug = uniqueSlug(input.name, taken);

    const created = await prisma.$transaction(async (tx) => {
      const insertAt = input.position ?? columns.length;

      if (input.position != null && input.position < columns.length) {
        await tx.kanbanColumn.updateMany({
          where: { userId, position: { gte: insertAt } },
          data: { position: { increment: 1 } },
        });
      }

      // Only one delivered column at a time — clear the flag elsewhere.
      if (input.isDeliveredColumn) {
        await tx.kanbanColumn.updateMany({
          where: { userId, isDeliveredColumn: true },
          data: { isDeliveredColumn: false },
        });
      }

      return tx.kanbanColumn.create({
        data: {
          userId,
          name: input.name,
          slug,
          color: input.color ?? null,
          position: insertAt,
          isDeliveredColumn: input.isDeliveredColumn ?? false,
          isDefault: false,
        },
        include: columnListInclude,
      });
    });

    await logActivity({
      userId,
      action: "KANBAN_COLUMN_CREATED",
      description: `Coluna "${created.name}" criada`,
      metadata: { columnId: created.id },
    });
    return serializeColumn(created);
  },

  async updateColumn(userId: string, id: string, input: UpdateColumnInput) {
    const column = await kanbanRepo.findColumn(userId, id);
    if (!column) throw new NotFoundError("Coluna");

    const data: Prisma.KanbanColumnUpdateInput = {};
    if (input.name !== undefined) {
      data.name = input.name;
      if (!column.isDefault) {
        const columns = await kanbanRepo.listColumns(userId);
        const taken = new Set(columns.filter((c) => c.id !== id).map((c) => c.slug));
        data.slug = uniqueSlug(input.name, taken);
      }
    }
    if (input.color !== undefined) data.color = input.color ?? null;

    const updated = await prisma.$transaction(async (tx) => {
      if (input.isDeliveredColumn === true) {
        await tx.kanbanColumn.updateMany({
          where: { userId, isDeliveredColumn: true, NOT: { id } },
          data: { isDeliveredColumn: false },
        });
        data.isDeliveredColumn = true;
      } else if (input.isDeliveredColumn === false) {
        data.isDeliveredColumn = false;
      }
      return tx.kanbanColumn.update({
        where: { id },
        data,
        include: columnListInclude,
      });
    });

    await logActivity({
      userId,
      action: "KANBAN_COLUMN_UPDATED",
      description: `Coluna "${updated.name}" atualizada`,
      metadata: { columnId: id, changes: input },
    });
    return serializeColumn(updated);
  },

  async deleteColumn(userId: string, id: string, moveToId?: string) {
    const column = await kanbanRepo.findColumn(userId, id);
    if (!column) throw new NotFoundError("Coluna");

    const totalColumns = await kanbanRepo.countColumns(userId);
    if (totalColumns <= 1) {
      throw new ConflictError("O quadro precisa de ao menos uma coluna.");
    }

    const cardCount = await prisma.projectKanban.count({ where: { columnId: id } });

    let target = null as null | { id: string };
    if (cardCount > 0) {
      const resolvedMoveTo =
        moveToId ??
        (await prisma.kanbanColumn.findFirst({
          where: { userId, NOT: { id } },
          orderBy: { position: "asc" },
          select: { id: true },
        }))?.id;

      if (!resolvedMoveTo) {
        throw new ConflictError("Informe uma coluna de destino para os projetos.");
      }
      if (resolvedMoveTo === id) {
        throw new BadRequestError("A coluna de destino não pode ser a mesma que está sendo excluída.");
      }
      const dest = await kanbanRepo.findColumn(userId, resolvedMoveTo);
      if (!dest) throw new NotFoundError("Coluna de destino");
      target = { id: dest.id };
    }

    await prisma.$transaction(async (tx) => {
      if (target && cardCount > 0) {
        const agg = await tx.projectKanban.aggregate({
          where: { columnId: target.id },
          _max: { position: true },
        });
        let pos = (agg._max.position ?? -1) + 1;
        const cards = await tx.projectKanban.findMany({
          where: { columnId: id },
          orderBy: { position: "asc" },
          select: { id: true },
        });
        for (const card of cards) {
          await tx.projectKanban.update({
            where: { id: card.id },
            data: { columnId: target.id, position: pos++ },
          });
        }
      }

      await tx.kanbanColumn.delete({ where: { id } });
      await tx.kanbanColumn.updateMany({
        where: { userId, position: { gt: column.position } },
        data: { position: { decrement: 1 } },
      });
    });

    await logActivity({
      userId,
      action: "KANBAN_COLUMN_DELETED",
      description: `Coluna "${column.name}" removida`,
      metadata: { columnId: id, movedCardsTo: target?.id ?? null, cardCount },
    });
    return { id, movedCardsTo: target?.id ?? null };
  },

  async reorderColumns(userId: string, input: ReorderColumnsInput) {
    const columns = await kanbanRepo.listColumns(userId);
    const ids = new Set(columns.map((c) => c.id));

    if (input.order.length !== columns.length || !input.order.every((id) => ids.has(id))) {
      throw new BadRequestError("A ordem informada não corresponde às colunas do quadro.");
    }

    await prisma.$transaction(
      input.order.map((id, index) =>
        prisma.kanbanColumn.update({ where: { id }, data: { position: index } }),
      ),
    );

    await logActivity({
      userId,
      action: "KANBAN_COLUMN_UPDATED",
      description: "Colunas reordenadas",
      metadata: { order: input.order },
    });

    const rows = await kanbanRepo.listColumns(userId);
    return rows.map(serializeColumn);
  },

  /** Board grouped by column, ready for a drag-and-drop UI. */
  async board(userId: string) {
    await kanbanService.ensureDefaultColumns(userId);
    const columns = await prisma.kanbanColumn.findMany({
      where: { userId },
      orderBy: { position: "asc" },
      include: {
        cards: {
          orderBy: { position: "asc" },
          include: {
            project: {
              include: {
                client: { select: { id: true, name: true, companyName: true } },
              },
            },
          },
        },
      },
    });

    return columns.map((col) => ({
      id: col.id,
      name: col.name,
      slug: col.slug,
      color: col.color,
      position: col.position,
      isDeliveredColumn: col.isDeliveredColumn,
      isDefault: col.isDefault,
      cards: col.cards.map((card) => ({
        projectId: card.projectId,
        position: card.position,
        title: card.project.title,
        value: Number(card.project.value),
        status: card.project.status,
        priority: card.project.priority,
        paymentStatus: card.project.paymentStatus,
        color: card.project.color,
        deadline: card.project.deadline,
        client: card.project.client,
      })),
    }));
  },

  slugFor(name: string) {
    return slugify(name);
  },
};
