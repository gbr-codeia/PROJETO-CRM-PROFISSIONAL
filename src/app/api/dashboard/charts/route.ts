import { withAuth } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { chartsQuerySchema } from "@/schemas/report.schema";
import { dashboardService } from "@/services/dashboard.service";
import { nowRef } from "@/utils/date";

export const GET = withAuth(async ({ userId, searchParams }) => {
  const { months, year } = chartsQuerySchema.parse(Object.fromEntries(searchParams));
  const end = year ? { month: 12, year } : nowRef();
  return ok(await dashboardService.charts(userId, { months, end }));
});
