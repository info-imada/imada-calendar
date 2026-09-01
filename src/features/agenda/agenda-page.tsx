import { ErrorState } from "@/components/product/states";
import { AgendaView } from "@/features/agenda/agenda-view";
import { getActivityWorkspaceModel } from "@/lib/activities/read-model";
import { getCurrentUser } from "@/lib/auth";

export async function AgendaPage({ initialActivityId }: { initialActivityId?: string }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return <section className="page-shell"><ErrorState description="Tu sesión no tiene permisos para consultar la agenda operativa." title="Acceso no disponible" /></section>;
  const model = await getActivityWorkspaceModel(currentUser.id);
  const modelVersion = model.activities.map((activity) => `${activity.id}:${activity.updatedAt}:${activity.status.id}`).join("|");
  return <AgendaView initialActivityId={initialActivityId} key={modelVersion} model={model} />;
}
