import { z } from "zod";
import { dateSchema, positiveMoneySchema } from "@/schemas/common.schema";

export const createPaymentSchema = z.object({
  amount: positiveMoneySchema,
  paymentDate: dateSchema.optional(),
  paymentMethod: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  /** Allow overpayment (e.g. tips / adjustments). Defaults to false. */
  allowOverpay: z.boolean().optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
