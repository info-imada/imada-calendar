import { getCurrentUser } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { buildWorkLogExcel } from "@/lib/work-logs/export";
import { getWorkLogHistoryModel } from "@/lib/work-logs/read-model";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  const permissions = await getEffectivePermissions(user.id);
  if (!permissions.can("worklog:read")) return Response.json({ errorCode: "FORBIDDEN" }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  if (dateFrom && dateTo && dateFrom > dateTo) return Response.json({ errorCode: "VALIDATION" }, { status: 400 });
  const history = await getWorkLogHistoryModel(user.id, { dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : undefined, dateTo: dateTo ? new Date(`${dateTo}T00:00:00.000Z`) : undefined, reference: params.get("reference") ?? undefined, status: (params.get("status") as "IN_PROGRESS" | "COMPLETION_PENDING" | "COMPLETED" | null) ?? undefined }, { page: 1, pageSize: 100 });
  const bytes = await buildWorkLogExcel(history.items);
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=registro-de-tarea.xlsx", "Cache-Control": "no-store" } });
}
