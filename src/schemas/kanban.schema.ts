import { z } from "zod";
import { idSchema } from "@/schemas/common.schema";

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "cor deve ser um hex válido (#RRGGBB)")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createColumnSchema = z.object({
  name: z.string().trim().min(1, "nome obrigatório").max(60),
  color: hexColor,
  isDeliveredColumn: z.boolean().optional(),
  /** Insert position; appended to the end when omitted. */
  position: z.coerce.number().int().min(0).optional(),
});
export type CreateColumnInput = z.infer<typeof createColumnSchema>;

export const updateColumnSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    color: hexColor,
    isDeliveredColumn: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "nenhum campo para atualizar" });
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;

/** PUT /api/kanban/columns/reorder */
export const reorderColumnsSchema = z.object({
  /** Full ordered list of column ids. */
  order: z.array(idSchema).min(1, "informe a nova ordem das colunas"),
});
export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>;

/** DELETE /api/kanban/columns/:id?moveTo=<columnId> */
export const deleteColumnQuerySchema = z.object({
  moveTo: idSchema.optional(),
});
