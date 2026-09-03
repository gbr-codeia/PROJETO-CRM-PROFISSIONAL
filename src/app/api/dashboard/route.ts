import { withAuth } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { dashboardQuerySchema } from "@/schemas/report.schema";
import { dashboardService } from "@/services/dashboard.service";
import { nowRef } from "@/utils/date";

export const GET = withAuth(async ({ userId, searchParams }) => {
  const { month, year } = dashboardQuerySchema.parse(Object.fromEntries(searchParams));
  const fallback = nowRef();
  const ref = { month: month ?? fallback.month, year: year ?? fallback.year };
  return ok(await dashboardService.summary(userId, ref));
});
