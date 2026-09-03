import { withAuth, readJson } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { idParamSchema } from "@/schemas/common.schema";
import { updateFinancialSchema } from "@/schemas/financial.schema";
import { financialService } from "@/services/financial.service";

export const GET = withAuth(async ({ userId, params }) => {
  const { id } = idParamSchema.parse(params);
  return ok(await financialService.get(userId, id));
});

export const PUT = withAuth(async ({ userId, params, req }) => {
  const { id } = idParamSchema.parse(params);
  const body = updateFinancialSchema.parse(await readJson(req));
  return ok(await financialService.update(userId, id, body));
});

export const PATCH = PUT;

export const DELETE = withAuth(async ({ userId, params }) => {
  const { id } = idParamSchema.parse(params);
  return ok(await financialService.remove(userId, id));
});
