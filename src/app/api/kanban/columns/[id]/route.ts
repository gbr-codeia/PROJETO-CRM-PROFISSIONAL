import { withAuth, readJson } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { idParamSchema } from "@/schemas/common.schema";
import {
  deleteColumnQuerySchema,
  updateColumnSchema,
} from "@/schemas/kanban.schema";
import { kanbanService } from "@/services/kanban.service";

export const GET = withAuth(async ({ userId, params }) => {
  const { id } = idParamSchema.parse(params);
  return ok(await kanbanService.getColumn(userId, id));
});

export const PUT = withAuth(async ({ userId, params, req }) => {
  const { id } = idParamSchema.parse(params);
  const body = updateColumnSchema.parse(await readJson(req));
  return ok(await kanbanService.updateColumn(userId, id, body));
});

export const PATCH = PUT;

export const DELETE = withAuth(async ({ userId, params, searchParams }) => {
  const { id } = idParamSchema.parse(params);
  const { moveTo } = deleteColumnQuerySchema.parse(Object.fromEntries(searchParams));
  return ok(await kanbanService.deleteColumn(userId, id, moveTo));
});
