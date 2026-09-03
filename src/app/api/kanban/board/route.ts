import { withAuth } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { kanbanService } from "@/services/kanban.service";

export const GET = withAuth(async ({ userId }) => {
  return ok(await kanbanService.board(userId));
});
