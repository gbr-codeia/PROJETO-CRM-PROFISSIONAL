import { withAuth } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { monthlyReportQuerySchema } from "@/schemas/report.schema";
import { reportService } from "@/services/report.service";

export const GET = withAuth(async ({ userId, searchParams }) => {
  const query = monthlyReportQuerySchema.parse(Object.fromEntries(searchParams));
  return ok(await reportService.monthly(userId, query));
});
