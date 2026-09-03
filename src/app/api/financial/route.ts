import { withAuth, readJson } from "@/lib/api-handler";
import { created, ok } from "@/lib/api-response";
import { pageMeta } from "@/lib/pagination";
import { searchParamsToObject } from "@/schemas/common.schema";
import {
  createFinancialSchema,
  listFinancialQuerySchema,
} from "@/schemas/financial.schema";
import { financialService } from "@/services/financial.service";

export const GET = withAuth(async ({ userId, searchParams }) => {
  const query = listFinancialQuerySchema.parse(searchParamsToObject(searchParams));
  const result = await financialService.list(userId, query);
  return ok(result.items, pageMeta(result));
});

export const POST = withAuth(async ({ userId, req }) => {
  const body = createFinancialSchema.parse(await readJson(req));
  return created(await financialService.create(userId, body));
});
