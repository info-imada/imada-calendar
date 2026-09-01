"use client";

import { ClipboardCheckIcon, HistoryIcon } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/product/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WorkLogHistoryModel, WorkLogWorkspaceModel } from "@/features/work-logs/work-log-types";
import { WorkLogForm } from "@/features/work-logs/work-log-form";
import { WorkLogHistory } from "@/features/work-logs/work-log-history";

export function WorkLogPage({ workspace, history, initialActivityId, initialWorkLogId }: { workspace: WorkLogWorkspaceModel; history: WorkLogHistoryModel; initialActivityId?: string; initialWorkLogId?: string }) {
  return <PageContainer><PageHeader description="Registra el trabajo ejecutado, controla tu jornada y conserva evidencia operativa." eyebrow="Operación" title="Registro de tarea" meta={<ClipboardCheckIcon className="size-5 text-primary" />} /><Tabs className="mt-5 min-w-0" defaultValue="register"><TabsList className="grid h-auto w-full grid-cols-2 sm:w-fit"><TabsTrigger value="register"><ClipboardCheckIcon /> Registrar</TabsTrigger><TabsTrigger value="history"><HistoryIcon /> Historial</TabsTrigger></TabsList><TabsContent className="mt-4 min-w-0" value="register"><WorkLogForm initialActivityId={initialActivityId} initialWorkLogId={initialWorkLogId} workspace={workspace} /></TabsContent><TabsContent className="mt-4 min-w-0" value="history"><WorkLogHistory model={history} /></TabsContent></Tabs></PageContainer>;
}
