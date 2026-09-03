import { withAuth, readJson } from "@/lib/api-handler";
import { created, ok } from "@/lib/api-response";
import { pageMeta } from "@/lib/pagination";
import { searchParamsToObject } from "@/schemas/common.schema";
import {
  createProjectSchema,
  listProjectsQuerySchema,
} from "@/schemas/project.schema";
import { projectService } from "@/services/project.service";

export const GET = withAuth(async ({ userId, searchParams }) => {
  const query = listProjectsQuerySchema.parse(searchParamsToObject(searchParams));
  const result = await projectService.list(userId, query);
  return ok(result.items, pageMeta(result));
});

export const POST = withAuth(async ({ userId, req }) => {
  const body = createProjectSchema.parse(await readJson(req));
  return created(await projectService.create(userId, body));
});
