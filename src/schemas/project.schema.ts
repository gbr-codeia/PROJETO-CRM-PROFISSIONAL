import { z } from "zod";
import { ProjectStatus, Priority, PaymentStatus } from "@prisma/client";
import {
  dateSchema,
  idSchema,
  moneySchema,
  paginationSchema,
} from "@/schemas/common.schema";

export const projectStatusSchema = z.nativeEnum(ProjectStatus);
export const prioritySchema = z.nativeEnum(Priority);
export const paymentStatusSchema = z.nativeEnum(PaymentStatus);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

/** Hex color tag (#RGB or #RRGGBB). Empty string clears it. */
const colorTagSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "cor deve ser um hex válido (#RRGGBB)")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createProjectSchema = z
  .object({
    clientId: idSchema,
    title: z.string().trim().min(2, "título muito curto").max(160),
    description: optionalText(8000),
    projectType: optionalText(80),
    value: moneySchema.default(0),
    entryDate: dateSchema.optional(),
    deadline: dateSchema.optional(),
    status: projectStatusSchema.optional(),
    priority: prioritySchema.default(Priority.MEDIUM),
    paymentStatus: paymentStatusSchema.default(PaymentStatus.PENDING),
    paymentMethod: optionalText(60),
    color: colorTagSchema,
    notes: optionalText(8000),
    /** Optionally place the new project directly into a Kanban column. */
    columnId: idSchema.optional(),
  })
  .refine(
    (v) => !v.deadline || !v.entryDate || v.deadline >= v.entryDate,
    { message: "o prazo não pode ser anterior à data de entrada", path: ["deadline"] },
  );
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    clientId: idSchema.optional(),
    title: z.string().trim().min(2).max(160).optional(),
    description: optionalText(8000),
    projectType: optionalText(80),
    value: moneySchema.optional(),
    entryDate: dateSchema.optional(),
    deadline: dateSchema.nullable().optional(),
    deliveredAt: dateSchema.nullable().optional(),
    completedAt: dateSchema.nullable().optional(),
    status: projectStatusSchema.optional(),
    priority: prioritySchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    paymentMethod: optionalText(60),
    color: colorTagSchema.or(z.null()),
    notes: optionalText(8000),
    /** When status is set to CANCELLED: what to do with linked financial records. */
    financialPolicy: z.enum(["keep", "cancel"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "nenhum campo para atualizar" });
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/** POST /api/projects/:id/move */
export const moveProjectSchema = z.object({
  columnId: idSchema,
  /** Target index inside the destination column (0-based). Defaults to append. */
  position: z.coerce.number().int().min(0).optional(),
});
export type MoveProjectInput = z.infer<typeof moveProjectSchema>;

/** DELETE /api/projects/:id?financial=keep|cancel */
export const deleteProjectQuerySchema = z.object({
  financial: z.enum(["keep", "cancel"]).default("keep"),
});

/** PUT/PATCH cancel flow when status → CANCELLED */
export const cancelFinancialPolicySchema = z.enum(["keep", "cancel"]).default("keep");

export const listProjectsQuerySchema = paginationSchema.extend({
  sortBy: z
    .enum(["createdAt", "updatedAt", "deadline", "entryDate", "deliveredAt", "value", "title"])
    .default("createdAt"),
  status: z
    .union([projectStatusSchema, z.array(projectStatusSchema)])
    .optional(),
  priority: z.union([prioritySchema, z.array(prioritySchema)]).optional(),
  paymentStatus: z.union([paymentStatusSchema, z.array(paymentStatusSchema)]).optional(),
  clientId: idSchema.optional(),
  columnId: idSchema.optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
