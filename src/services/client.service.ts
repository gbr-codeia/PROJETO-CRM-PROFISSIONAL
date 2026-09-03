import type { Prisma } from "@prisma/client";
import { clientRepo } from "@/repositories/client.repository";
import { serializeClient } from "@/lib/serialize";
import { paginate, toSkipTake } from "@/lib/pagination";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { logActivity } from "@/services/activity.service";
import type {
  CreateClientInput,
  ListClientsQuery,
  UpdateClientInput,
} from "@/schemas/client.schema";

export const clientService = {
  async list(userId: string, query: ListClientsQuery) {
    const { page, pageSize, sortBy, sortDir, search } = query;

    const where: Prisma.ClientWhereInput = {
      userId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { companyName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const { skip, take } = toSkipTake({ page, pageSize });
    const [rows, total] = await clientRepo.list(where, { [sortBy]: sortDir }, skip, take);

    return paginate(rows.map(serializeClient), total, { page, pageSize });
  },

  async get(userId: string, id: string) {
    const row = await clientRepo.findByIdForUser(userId, id);
    if (!row) throw new NotFoundError("Cliente");
    return serializeClient(row);
  },

  async create(userId: string, input: CreateClientInput) {
    const row = await clientRepo.create({ userId, ...input });
    await logActivity({
      userId,
      action: "CLIENT_CREATED",
      description: `Cliente "${row.name}" criado`,
      metadata: { clientId: row.id },
    });
    return serializeClient(row);
  },

  async update(userId: string, id: string, input: UpdateClientInput) {
    await clientService.assertOwned(userId, id);
    const row = await clientRepo.update(id, userId, input);
    await logActivity({
      userId,
      action: "CLIENT_UPDATED",
      description: `Cliente "${row.name}" atualizado`,
      metadata: { clientId: id, changes: input },
    });
    return serializeClient(row);
  },

  async remove(userId: string, id: string) {
    await clientService.assertOwned(userId, id);
    const projectCount = await clientRepo.countProjects(id);
    if (projectCount > 0) {
      throw new ConflictError(
        `Não é possível excluir: o cliente possui ${projectCount} projeto(s) vinculado(s).`,
        { projectCount },
      );
    }
    await clientRepo.delete(id, userId);
    await logActivity({
      userId,
      action: "CLIENT_DELETED",
      description: `Cliente removido`,
      metadata: { clientId: id },
    });
    return { id };
  },

  async assertOwned(userId: string, id: string) {
    const row = await clientRepo.findByIdForUser(userId, id);
    if (!row) throw new NotFoundError("Cliente");
    return row;
  },
};
