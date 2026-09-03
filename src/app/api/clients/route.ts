import { withAuth, readJson } from "@/lib/api-handler";
import { created, ok } from "@/lib/api-response";
import { pageMeta } from "@/lib/pagination";
import { searchParamsToObject } from "@/schemas/common.schema";
import {
  createClientSchema,
  listClientsQuerySchema,
} from "@/schemas/client.schema";
import { clientService } from "@/services/client.service";

export const GET = withAuth(async ({ userId, searchParams }) => {
  const query = listClientsQuerySchema.parse(searchParamsToObject(searchParams));
  const result = await clientService.list(userId, query);
  return ok(result.items, pageMeta(result));
});

export const POST = withAuth(async ({ userId, req }) => {
  const body = createClientSchema.parse(await readJson(req));
  return created(await clientService.create(userId, body));
});
