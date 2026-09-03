import { z } from "zod";

/** cuid-like id (Prisma @default(cuid())). Accepts cuid and cuid2 shapes. */
export const idSchema = z
  .string()
  .min(1, "id obrigatório")
  .max(64)
  .regex(/^[a-z0-9]+$/i, "id inválido");

export const idParamSchema = z.object({ id: idSchema });

/** Money: accepts number or numeric string, non-negative, max 2 decimals, < 1e11. */
export const moneySchema = z
  .union([z.number(), z.string()])
  .transform((v, ctx) => {
    const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "valor monetário inválido" });
      return z.NEVER;
    }
    return n;
  })
  .pipe(
    z
      .number()
      .nonnegative("valor não pode ser negativo")
      .max(99_999_999_999, "valor acima do limite")
      .refine((n) => Number.isInteger(Math.round(n * 100)), "no máximo 2 casas decimais"),
  );

export const positiveMoneySchema = moneySchema.pipe(z.number().positive("valor deve ser maior que zero"));

/** Accept ISO string / Date / epoch and normalize to Date. */
export const dateSchema = z.coerce.date({ invalid_type_error: "data inválida" });

/** Loose phone: digits, spaces, +, -, (), 6..24 chars. */
export const phoneSchema = z
  .string()
  .trim()
  .min(6, "telefone muito curto")
  .max(24, "telefone muito longo")
  .regex(/^[+\d][\d\s()-]{4,}$/, "formato de telefone inválido");

export const emailSchema = z.string().trim().toLowerCase().email("e-mail inválido");

export const instagramSchema = z
  .string()
  .trim()
  .max(60)
  .transform((v) => v.replace(/^@/, ""))
  .refine((v) => /^[A-Za-z0-9._]+$/.test(v), "handle do Instagram inválido");

/** Pagination + sorting shared by list endpoints. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().trim().max(120).optional(),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

/** Month/year filter shared by dashboard, financial and reports. */
export const periodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type PeriodInput = z.infer<typeof periodSchema>;

/** Parse URLSearchParams into a plain object (repeated keys → array). */
export function searchParamsToObject(sp: URLSearchParams): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of sp.keys()) {
    const all = sp.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}
