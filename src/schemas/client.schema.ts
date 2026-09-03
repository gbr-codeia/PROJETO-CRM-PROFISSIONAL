import { z } from "zod";
import {
  emailSchema,
  instagramSchema,
  paginationSchema,
  phoneSchema,
} from "@/schemas/common.schema";

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const createClientSchema = z.object({
  name: z.string().trim().min(2, "nome muito curto").max(120),
  companyName: optionalTrimmed(160),
  email: emailSchema.optional().or(z.literal("").transform(() => undefined)),
  phone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
  whatsapp: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
  instagram: instagramSchema.optional().or(z.literal("").transform(() => undefined)),
  notes: optionalTrimmed(5000),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial();
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const listClientsQuerySchema = paginationSchema.extend({
  sortBy: z.enum(["name", "companyName", "createdAt", "updatedAt"]).default("name"),
});
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
