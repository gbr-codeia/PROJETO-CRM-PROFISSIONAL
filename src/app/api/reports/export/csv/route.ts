import { withAuth } from "@/lib/api-handler";
import { exportQuerySchema } from "@/schemas/report.schema";
import { reportService } from "@/services/report.service";

export const GET = withAuth(async ({ userId, searchParams }) => {
  const query = exportQuerySchema.parse(Object.fromEntries(searchParams));
  const { filename, content } = await reportService.exportCsv(userId, query);

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
