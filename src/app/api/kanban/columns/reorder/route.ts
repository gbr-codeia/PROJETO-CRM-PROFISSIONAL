import { withAuth, readJson } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { reorderColumnsSchema } from "@/schemas/kanban.schema";
import { kanbanService } from "@/services/kanban.service";

export const PUT = withAuth(async ({ userId, req }) => {
  const body = reorderColumnsSchema.parse(await readJson(req));
  return ok(await kanbanService.reorderColumns(userId, body));
});

export const POST = PUT;
