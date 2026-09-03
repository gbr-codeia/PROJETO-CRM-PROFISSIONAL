import { withAuth, readJson } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { idParamSchema } from "@/schemas/common.schema";
import { moveProjectSchema } from "@/schemas/project.schema";
import { projectService } from "@/services/project.service";

export const POST = withAuth(async ({ userId, params, req }) => {
  const { id } = idParamSchema.parse(params);
  const body = moveProjectSchema.parse(await readJson(req));
  return ok(await projectService.move(userId, id, body));
});

export const PUT = POST;
