import { z } from "zod";
import { withAuth } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { pageMeta } from "@/lib/pagination";
import { idSchema } from "@/schemas/common.schema";
import { listActivities } from "@/services/activity.service";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  projectId: idSchema.optional(),
});

export const GET = withAuth(async ({ userId, searchParams }) => {
  const { page, pageSize, projectId } = querySchema.parse(Object.fromEntries(searchParams));
  const result = await listActivities(userId, { page, pageSize, projectId });
  return ok(result.items, pageMeta(result));
});
