import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarWorkspace } from "@/features/calendar/calendar-workspace";
import { getActivityWorkspaceModel } from "@/lib/activities/read-model";
import { getCurrentUser } from "@/lib/auth";

export default async function CalendarPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return <section className="page-shell"><Alert variant="destructive"><AlertTitle>Acceso no disponible</AlertTitle><AlertDescription>Tu sesión no tiene permisos para consultar el calendario operativo.</AlertDescription></Alert></section>;
  const model = await getActivityWorkspaceModel(currentUser.id);
  return <CalendarWorkspace model={model} />;
}
