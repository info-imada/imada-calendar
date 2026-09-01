import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return <section aria-label="Cargando calendario" className="page-shell"><div className="space-y-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-10 w-72 max-w-full" /><Skeleton className="h-5 max-w-2xl" /></div><Card className="card-enterprise"><CardContent className="space-y-4 p-3 sm:p-4 lg:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><Skeleton className="h-9 w-full sm:w-72" /><Skeleton className="h-9 w-full sm:w-96" /></div><Skeleton className="h-12 w-full" /><Skeleton className="h-[38rem] w-full rounded-xl" /></CardContent></Card></section>;
}
