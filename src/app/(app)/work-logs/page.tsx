import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WorkLogPage } from "@/features/work-logs/work-log-page";
import { getCurrentUser } from "@/lib/auth";
import { getWorkLogHistoryModel, getWorkLogWorkspaceModel } from "@/lib/work-logs/read-model";

export default async function WorkLogsPage({ searchParams }: { searchParams?: Promise<{ activity?: string; workLog?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return <AccessDenied />;
  let workspace;
  try {
    workspace = await getWorkLogWorkspaceModel(user.id);
  } catch {
    return <AccessDenied />;
  }
  if (!workspace.capabilities.canRead && !workspace.capabilities.canCreate && !workspace.capabilities.canUpdate) return <AccessDenied />;
  const history = workspace.capabilities.canRead ? await getWorkLogHistoryModel(user.id) : { items: [], page: 1, pageSize: 50, total: 0, hasNextPage: false };
  const params = searchParams ? await searchParams : {};
  return <WorkLogPage history={history} initialActivityId={params.activity} initialWorkLogId={params.workLog} workspace={workspace} />;
}

function AccessDenied() {
  return <main className="page-shell"><Alert><AlertTitle>Acceso restringido</AlertTitle><AlertDescription>No tienes permisos efectivos para consultar el Registro de tarea.</AlertDescription></Alert></main>;
}
