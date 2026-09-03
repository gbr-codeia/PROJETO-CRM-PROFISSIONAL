import { withAuth, readJson } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { idParamSchema } from "@/schemas/common.schema";
import {
  deleteProjectQuerySchema,
  updateProjectSchema,
} from "@/schemas/project.schema";
import { projectService } from "@/services/project.service";

export const GET = withAuth(async ({ userId, params }) => {
  const { id } = idParamSchema.parse(params);
  return ok(await projectService.get(userId, id));
});

export const PUT = withAuth(async ({ userId, params, req }) => {
  const { id } = idParamSchema.parse(params);
  const body = updateProjectSchema.parse(await readJson(req));
  return ok(await projectService.update(userId, id, body));
});

export const PATCH = PUT;

export const DELETE = withAuth(async ({ userId, params, searchParams }) => {
  const { id } = idParamSchema.parse(params);
  const { financial } = deleteProjectQuerySchema.parse(
    Object.fromEntries(searchParams),
  );
  return ok(await projectService.remove(userId, id, financial));
});
