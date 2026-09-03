import { z } from "zod";
import { idSchema } from "@/schemas/common.schema";

export const monthlyReportQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  clientId: idSchema.optional(),
});
export type MonthlyReportQuery = z.infer<typeof monthlyReportQuerySchema>;

export const exportQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  clientId: idSchema.optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  /** Reserved for future formats. */
  format: z.enum(["csv"]).default("csv"),
});
export type ExportQuery = z.infer<typeof exportQuerySchema>;

export const dashboardQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const chartsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(36).default(6),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
export type ChartsQuery = z.infer<typeof chartsQuerySchema>;
