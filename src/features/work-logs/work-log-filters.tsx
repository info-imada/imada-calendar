"use client";

import { FilterBar } from "@/components/product/page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkLogStatus } from "@/features/work-logs/work-log-types";

export type WorkLogFilterState = { dateFrom: string; dateTo: string; reference: string; status: "" | WorkLogStatus };

export function WorkLogFilters({ value, onChange }: { value: WorkLogFilterState; onChange: (value: WorkLogFilterState) => void }) {
  const activeCount = Object.values(value).filter(Boolean).length;
  return <FilterBar activeCount={activeCount} title="Filtros del historial"><div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-1"><Label htmlFor="history-date-from">Desde</Label><Input id="history-date-from" onChange={(event) => onChange({ ...value, dateFrom: event.target.value })} type="date" value={value.dateFrom} /></div><div className="space-y-1"><Label htmlFor="history-date-to">Hasta</Label><Input id="history-date-to" onChange={(event) => onChange({ ...value, dateTo: event.target.value })} type="date" value={value.dateTo} /></div><div className="space-y-1"><Label htmlFor="history-reference">Modelo o serie</Label><Input id="history-reference" onChange={(event) => onChange({ ...value, reference: event.target.value })} placeholder="Buscar referencia" value={value.reference} /></div><div className="space-y-1"><Label htmlFor="history-status">Estado</Label><select className="flex min-h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm" id="history-status" onChange={(event) => onChange({ ...value, status: event.target.value as WorkLogFilterState["status"] })} value={value.status}><option value="">Todos los estados</option><option value="IN_PROGRESS">Jornada en curso</option><option value="COMPLETION_PENDING">Finalización marcada</option><option value="COMPLETED">Completada</option></select></div></div></FilterBar>;
}
