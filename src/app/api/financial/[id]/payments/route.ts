import { withAuth, readJson } from "@/lib/api-handler";
import { created, ok } from "@/lib/api-response";
import { idParamSchema } from "@/schemas/common.schema";
import { createPaymentSchema } from "@/schemas/payment.schema";
import { paymentService } from "@/services/payment.service";

export const GET = withAuth(async ({ userId, params }) => {
  const { id } = idParamSchema.parse(params);
  return ok(await paymentService.list(userId, id));
});

export const POST = withAuth(async ({ userId, params, req }) => {
  const { id } = idParamSchema.parse(params);
  const body = createPaymentSchema.parse(await readJson(req));
  return created(await paymentService.create(userId, id, body));
});
