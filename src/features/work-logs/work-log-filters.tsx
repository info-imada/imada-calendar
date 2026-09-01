"use client";

import { FilterBar } from "@/components/product/page";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WorkLogStatus } from "@/features/work-logs/work-log-types";
import { CalendarDaysIcon, XIcon } from "lucide-react";

export type WorkLogFilterState = { dateFrom: string; dateTo: string; reference: string; status: "" | WorkLogStatus };

const emptyFilters: WorkLogFilterState = { dateFrom: "", dateTo: "", reference: "", status: "" };

function parseDate(value: string) {
  return value ? new Date(`${value}T12:00:00`) : undefined;
}

function formatDate(value: string) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "Seleccionar fecha";
}

function DateFilter({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return <div className="min-w-0 space-y-1.5"><Label htmlFor={id}>{label}</Label><Popover><PopoverTrigger render={<Button aria-label={label} className="w-full justify-between font-normal" id={id} variant="outline" />}><span className={value ? "truncate" : "truncate text-muted-foreground"}>{formatDate(value)}</span><CalendarDaysIcon aria-hidden="true" /></PopoverTrigger><PopoverContent align="start" className="w-auto p-0"><Calendar mode="single" selected={parseDate(value)} onSelect={(date) => onChange(date ? date.toISOString().slice(0, 10) : "")} /></PopoverContent></Popover></div>;
}

export function WorkLogFilters({ value, onChange }: { value: WorkLogFilterState; onChange: (value: WorkLogFilterState) => void }) {
  const activeCount = Object.values(value).filter(Boolean).length;
  return <FilterBar activeCount={activeCount} title="Filtros del historial"><div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4"><DateFilter id="history-date-from" label="Desde" onChange={(dateFrom) => onChange({ ...value, dateFrom })} value={value.dateFrom} /><DateFilter id="history-date-to" label="Hasta" onChange={(dateTo) => onChange({ ...value, dateTo })} value={value.dateTo} /><div className="min-w-0 space-y-1.5"><Label htmlFor="history-reference">Modelo o serie</Label><Input id="history-reference" onChange={(event) => onChange({ ...value, reference: event.target.value })} placeholder="Buscar referencia" value={value.reference} /></div><div className="min-w-0 space-y-1.5"><Label htmlFor="history-status">Estado</Label><Select onValueChange={(status) => onChange({ ...value, status: (status ?? "") as WorkLogFilterState["status"] })} value={value.status}><SelectTrigger aria-label="Estado" className="w-full" id="history-status"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectItem value="">Todos los estados</SelectItem><SelectItem value="IN_PROGRESS">Jornada en curso</SelectItem><SelectItem value="COMPLETION_PENDING">Finalización marcada</SelectItem><SelectItem value="COMPLETED">Completada</SelectItem></SelectContent></Select></div>{activeCount ? <Button className="w-full sm:col-span-2 sm:w-fit lg:col-span-4" onClick={() => onChange(emptyFilters)} variant="ghost"><XIcon aria-hidden="true" /> Limpiar filtros</Button> : null}</div></FilterBar>;
}
