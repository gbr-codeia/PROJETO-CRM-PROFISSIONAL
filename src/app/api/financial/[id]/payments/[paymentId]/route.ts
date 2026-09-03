import { z } from "zod";
import { withAuth } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { idSchema } from "@/schemas/common.schema";
import { paymentService } from "@/services/payment.service";

const paramsSchema = z.object({ id: idSchema, paymentId: idSchema });

export const DELETE = withAuth(async ({ userId, params }) => {
  const { id, paymentId } = paramsSchema.parse(params);
  return ok(await paymentService.remove(userId, id, paymentId));
});
