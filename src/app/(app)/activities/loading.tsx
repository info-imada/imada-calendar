import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActivitiesLoading() {
  return <section aria-label="Cargando actividades" className="page-shell"><div className="space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-64" /><Skeleton className="h-5 max-w-2xl" /></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Card className="card-enterprise" key={index}><CardContent className="space-y-3 p-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-9 w-16" /></CardContent></Card>)}</div><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></section>;
}
