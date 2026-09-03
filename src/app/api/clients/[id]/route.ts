import { withAuth, readJson } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { idParamSchema } from "@/schemas/common.schema";
import { updateClientSchema } from "@/schemas/client.schema";
import { clientService } from "@/services/client.service";

export const GET = withAuth(async ({ userId, params }) => {
  const { id } = idParamSchema.parse(params);
  return ok(await clientService.get(userId, id));
});

export const PUT = withAuth(async ({ userId, params, req }) => {
  const { id } = idParamSchema.parse(params);
  const body = updateClientSchema.parse(await readJson(req));
  return ok(await clientService.update(userId, id, body));
});

export const PATCH = PUT;

export const DELETE = withAuth(async ({ userId, params }) => {
  const { id } = idParamSchema.parse(params);
  return ok(await clientService.remove(userId, id));
});
