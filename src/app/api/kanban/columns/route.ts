import { withAuth, readJson } from "@/lib/api-handler";
import { created, ok } from "@/lib/api-response";
import { createColumnSchema } from "@/schemas/kanban.schema";
import { kanbanService } from "@/services/kanban.service";

export const GET = withAuth(async ({ userId }) => {
  return ok(await kanbanService.listColumns(userId));
});

export const POST = withAuth(async ({ userId, req }) => {
  const body = createColumnSchema.parse(await readJson(req));
  return created(await kanbanService.createColumn(userId, body));
});
