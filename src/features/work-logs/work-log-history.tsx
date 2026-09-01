"use client";

import { DownloadIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { WorkLogHistoryModel } from "@/features/work-logs/work-log-types";
import { WorkLogDetail } from "@/features/work-logs/work-log-detail";
import { WorkLogFilters, type WorkLogFilterState } from "@/features/work-logs/work-log-filters";

export function WorkLogHistory({ model }: { model: WorkLogHistoryModel }) {
  const [filters, setFilters] = useState<WorkLogFilterState>({ dateFrom: "", dateTo: "", reference: "", status: "" });
  const [exporting, setExporting] = useState(false);
  const filtered = useMemo(() => model.items.filter((item) => (!filters.dateFrom || item.workDate >= filters.dateFrom) && (!filters.dateTo || item.workDate <= filters.dateTo) && (!filters.reference || item.machineReference?.toLowerCase().includes(filters.reference.toLowerCase())) && (!filters.status || item.status === filters.status)), [filters, model.items]);
  async function exportExcel() {
    setExporting(true);
    try {
      const params = new URLSearchParams(); if (filters.dateFrom) params.set("dateFrom", filters.dateFrom); if (filters.dateTo) params.set("dateTo", filters.dateTo); if (filters.reference) params.set("reference", filters.reference); if (filters.status) params.set("status", filters.status);
      const response = await fetch(`/api/work-logs/export?${params.toString()}`); if (!response.ok) throw new Error();
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "registro-de-tarea.xlsx"; anchor.click(); URL.revokeObjectURL(url);
    } catch { toast.error("No fue posible exportar el historial."); } finally { setExporting(false); }
  }
  return <div className="min-w-0 space-y-4"><div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><WorkLogFilters onChange={setFilters} value={filters} /><Button disabled={exporting} onClick={exportExcel} variant="outline"><DownloadIcon /> {exporting ? "Generando…" : "Exportar Excel"}</Button></div>{!filtered.length ? <div className="card-enterprise p-6 text-center text-sm text-muted-foreground">No hay registros con estos filtros.</div> : <><div className="grid min-w-0 gap-3 md:hidden">{filtered.map((item) => <WorkLogDetail key={item.id} workLog={item} />)}</div><div className="hidden min-w-0 overflow-x-auto rounded-xl border border-border md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Técnico</th><th className="px-3 py-3">Cliente</th><th className="px-3 py-3">Referencia</th><th className="px-3 py-3">Duración</th><th className="px-3 py-3">Estado</th></tr></thead><tbody className="divide-y divide-border">{filtered.map((item) => <tr key={item.id}><td className="px-3 py-3">{item.workDate}</td><td className="px-3 py-3">{item.technician.name ?? item.technician.email}</td><td className="px-3 py-3">{item.customer?.name ?? "—"}</td><td className="px-3 py-3">{item.machineReference ?? "—"}</td><td className="px-3 py-3">{item.durationMinutes === null ? "—" : `${item.durationMinutes} min`}</td><td className="px-3 py-3">{item.status}</td></tr>)}</tbody></table></div></>}</div>;
}
