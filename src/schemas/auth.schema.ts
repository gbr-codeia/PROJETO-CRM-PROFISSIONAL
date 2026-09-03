import { z } from "zod";
import { emailSchema } from "@/schemas/common.schema";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "senha obrigatória"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "nome muito curto").max(120),
  email: emailSchema,
  password: z
    .string()
    .min(8, "a senha deve ter ao menos 8 caracteres")
    .max(72, "a senha deve ter no máximo 72 caracteres"),
  image: z.string().url("URL de avatar inválida").optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;
