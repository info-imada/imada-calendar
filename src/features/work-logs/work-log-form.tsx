"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2Icon, Clock3Icon, PlayCircleIcon, RotateCcwIcon, SquareIcon } from "lucide-react";
import { toast } from "sonner";

import { completeWorkLog, finishWorkLog, resetWorkLogStart, saveWorkLogDraft, startWorkLog } from "@/app/actions/work-logs";
import { ConfirmActionDialog, FormActions, FormSection } from "@/components/product/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import type { WorkLogWorkspaceModel } from "@/features/work-logs/work-log-types";
import { isStartResetAllowed } from "@/lib/work-logs/time";
import { WorkLogAttachments } from "@/features/work-logs/work-log-attachments";

const statusLabels = { IN_PROGRESS: "Jornada en curso", COMPLETION_PENDING: "Finalización marcada", COMPLETED: "Completada" } as const;

export function WorkLogForm({ workspace, initialActivityId }: { workspace: WorkLogWorkspaceModel; initialActivityId?: string; initialWorkLogId?: string }) {
  const active = workspace.activeWorkLog;
  const [scope, setScope] = useState("");
  const [activityId, setActivityId] = useState(initialActivityId ?? "");
  const [customerId, setCustomerId] = useState(active?.customer?.id ?? "");
  const [customerLocationId, setCustomerLocationId] = useState(active?.customerLocation?.id ?? "");
  const [machineReference, setMachineReference] = useState(active?.machineReference ?? "");
  const [location, setLocation] = useState(active?.location ?? "");
  const [description, setDescription] = useState(active?.description ?? "");
  const [attachmentIds, setAttachmentIds] = useState(active?.attachments.map((attachment) => attachment.id) ?? []);
  const [finishOpen, setFinishOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const selectedCustomer = workspace.customers.find((customer) => customer.id === customerId);
  const selectedScope = workspace.scopes.find((item) => `${item.country.id}:${item.team?.id ?? "country"}` === scope);
  const canReset = Boolean(active && active.status === "IN_PROGRESS" && !active.startResetUsedAt && isStartResetAllowed(active.startedAt));
  const completionReady = Boolean(active && customerId && machineReference.trim() && description.trim() && (customerLocationId || location.trim()));
  const canEditFields = Boolean(active && active.status !== "COMPLETED");
  const currentStatus = active?.status;
  const scopeOptions = useMemo(() => workspace.scopes.map((item) => ({ ...item, key: `${item.country.id}:${item.team?.id ?? "country"}` })), [workspace.scopes]);

  function run(action: () => Promise<{ success: boolean; errorCode?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await action();
      if (result.success) { toast.success(successMessage); router.refresh(); }
      else toast.error(result.errorCode === "FORBIDDEN" ? "No tienes permisos para esta operación." : result.errorCode === "CONFLICT" ? "El registro cambió o ya fue procesado." : "Revisa los datos e inténtalo nuevamente.");
    });
  }

  function begin() {
    if (activityId) return run(() => startWorkLog({ activityId }), "Jornada iniciada desde la actividad");
    if (!selectedScope) { toast.error("Selecciona un país o equipo permitido."); return; }
    run(() => startWorkLog({ countryId: selectedScope.country.id, teamId: selectedScope.team?.id }), "Hora de inicio marcada");
  }

  function save() {
    if (!active) return;
    run(() => saveWorkLogDraft({ workLogId: active.id, customerId: customerId || undefined, customerLocationId: customerLocationId || undefined, machineReference, location, description, attachmentIds }), "Borrador guardado");
  }

  function complete() {
    if (!active) return;
    run(() => completeWorkLog({ workLogId: active.id, customerId, customerLocationId: customerLocationId || undefined, machineReference, location: location || undefined, description, attachmentIds }), "Registro completado");
  }

  return <div className="min-w-0 space-y-4">
    <FormSection description="La hora se toma siempre del servidor y se muestra en tu zona horaria capturada." title="Jornada">
      {active ? <div className="flex min-w-0 flex-wrap items-center gap-2"><Badge variant={currentStatus === "COMPLETED" ? "secondary" : "default"}>{currentStatus ? statusLabels[currentStatus] : "Jornada"}</Badge><span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">Zona: {active.timezone}</span>{canReset ? <Button disabled={pending} onClick={() => run(() => resetWorkLogStart({ workLogId: active.id }), "Hora de inicio reiniciada")} size="sm" variant="outline"><RotateCcwIcon /> Reiniciar inicio</Button> : null}</div> : <div className="grid min-w-0 gap-3 sm:grid-cols-2"><div className="min-w-0 space-y-2"><Label htmlFor="work-log-scope">País o equipo permitido</Label><Select disabled={pending || !scopeOptions.length} onValueChange={(value) => setScope(value ?? "")} value={scope}><SelectTrigger aria-label="País o equipo permitido" className="w-full" id="work-log-scope"><SelectValue placeholder="Selecciona un alcance" /></SelectTrigger><SelectContent>{scopeOptions.map((item) => <SelectItem key={item.key} value={item.key}>{item.country.name}{item.team ? ` · ${item.team.name}` : " · Todos los equipos"}</SelectItem>)}</SelectContent></Select></div><div className="min-w-0 space-y-2"><Label htmlFor="work-log-activity">Actividad (opcional)</Label><Select disabled={pending} onValueChange={(value) => setActivityId(value ?? "")} value={activityId}><SelectTrigger aria-label="Actividad opcional" className="w-full" id="work-log-activity"><SelectValue placeholder="Trabajo no planificado" /></SelectTrigger><SelectContent><SelectItem value="">Trabajo no planificado</SelectItem>{workspace.activities.map((activity) => <SelectItem key={activity.id} value={activity.id}>{activity.title}</SelectItem>)}</SelectContent></Select></div></div>}
      {!active ? <Button className="w-full sm:w-auto" disabled={pending || !workspace.capabilities.canCreate} onClick={begin}><PlayCircleIcon /> Marcar hora de inicio</Button> : null}
    </FormSection>
    <fieldset className="min-w-0 space-y-4" disabled={pending || !canEditFields}>
      <FormSection description="Selecciona primero un cliente para mostrar sus ubicaciones activas." title="Cliente y ubicación">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2"><div className="min-w-0 space-y-2"><Label htmlFor="work-log-customer">Cliente</Label><Select onValueChange={(value) => { setCustomerId(value ?? ""); setCustomerLocationId(""); }} value={customerId}><SelectTrigger className="w-full" id="work-log-customer"><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger><SelectContent>{workspace.customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent></Select></div><div className="min-w-0 space-y-2"><Label htmlFor="work-log-location">Ubicación</Label><Select disabled={!selectedCustomer?.locations.length} onValueChange={(value) => setCustomerLocationId(value ?? "")} value={customerLocationId}><SelectTrigger className="w-full" id="work-log-location"><SelectValue placeholder={selectedCustomer ? "Selecciona una ubicación" : "Selecciona primero un cliente"} /></SelectTrigger><SelectContent>{selectedCustomer?.locations.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div></div>
        <div className="space-y-2"><Label htmlFor="work-log-manual-location">Ubicación manual <span className="font-normal text-muted-foreground">(si no está en catálogo)</span></Label><Input id="work-log-manual-location" onChange={(event) => setLocation(event.target.value)} placeholder="Ej. Bodega norte" value={location} /></div>
      </FormSection>
      <FormSection title="Modelo o número de serie"><Input aria-label="Modelo o número de serie" id="work-log-reference" onChange={(event) => setMachineReference(event.target.value)} placeholder="Ej. IMADA-12345" value={machineReference} /></FormSection>
      <FormSection description="Describe actividades, revisiones y resultados de la tarea." title="Descripción"><Textarea aria-label="Descripción del trabajo realizado" className="min-h-36" id="work-log-description" onChange={(event) => setDescription(event.target.value)} placeholder="Describe las actividades, revisiones y resultados de la tarea" value={description} /></FormSection>
      <FormSection title="Adjuntos"><WorkLogAttachments attachments={active?.attachments ?? []} onChange={setAttachmentIds} workLogId={active?.id ?? null} /></FormSection>
    </fieldset>
    {active ? <FormActions><Button disabled={pending || active.status !== "IN_PROGRESS"} onClick={save} variant="outline"><Clock3Icon /> Guardar borrador</Button>{active.status === "IN_PROGRESS" ? <Button disabled={pending} onClick={() => setFinishOpen(true)}><SquareIcon /> Marcar finalización</Button> : null}{active.status === "COMPLETION_PENDING" ? <Button disabled={pending || !completionReady} onClick={complete}><CheckCircle2Icon /> Completar registro</Button> : null}</FormActions> : null}
    <ConfirmActionDialog confirmLabel="Marcar finalización" description="La hora de finalización se tomará del servidor y ya no podrá modificarse. Después podrás completar los datos del registro." destructive onConfirm={() => { setFinishOpen(false); if (active) run(() => finishWorkLog({ workLogId: active.id }), "Finalización marcada"); }} onOpenChange={setFinishOpen} open={finishOpen} title="¿Marcar finalización?" />
  </div>;
}
