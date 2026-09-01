import { AgendaPage } from "@/features/agenda/agenda-page";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ activityId?: string }>;
}) {
  const { activityId } = await searchParams;
  return <AgendaPage initialActivityId={activityId} />;
}
