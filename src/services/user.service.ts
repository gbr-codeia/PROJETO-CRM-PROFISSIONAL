import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { kanbanService } from "@/services/kanban.service";
import type { RegisterInput } from "@/schemas/auth.schema";

export const userService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError("Já existe uma conta com este e-mail.");

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        image: input.image,
      },
    });

    // Bootstrap the default Kanban board for the new account.
    await kanbanService.ensureDefaultColumns(user.id);

    return { id: user.id, name: user.name, email: user.email, image: user.image };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    });
    if (!user) throw new NotFoundError("Usuário");
    return user;
  },
};
