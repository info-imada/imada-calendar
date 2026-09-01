"use client";

import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WORK_LOG_ATTACHMENT_MAX_BYTES, WORK_LOG_ATTACHMENT_MAX_COUNT, workLogAttachmentMimeTypes } from "@/lib/validations/work-log-attachments";
import type { WorkLogAttachmentPresentation } from "@/features/work-logs/work-log-types";

export function WorkLogAttachments({ workLogId, attachments, onChange }: { workLogId: string | null; attachments: WorkLogAttachmentPresentation[]; onChange: (ids: string[]) => void }) {
  const [pending, setPending] = useState(false);
  const [local, setLocal] = useState(attachments);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (!workLogId || !files.length) return;
    if (local.length + files.length > WORK_LOG_ATTACHMENT_MAX_COUNT) { toast.error("Puedes adjuntar máximo 5 archivos."); return; }
    setPending(true);
    try {
      const created: WorkLogAttachmentPresentation[] = [];
      for (const file of files) {
        if (file.size > WORK_LOG_ATTACHMENT_MAX_BYTES || !workLogAttachmentMimeTypes.includes(file.type as typeof workLogAttachmentMimeTypes[number])) { toast.error(`Archivo no permitido: ${file.name}`); continue; }
        const response = await fetch("/api/work-logs/attachments/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workLogId, name: file.name, type: file.type, size: file.size }) });
        const data = await response.json() as { attachmentId?: string; uploadUrl?: string; errorCode?: string };
        if (!response.ok || !data.attachmentId || !data.uploadUrl) { toast.error("No fue posible preparar el archivo."); continue; }
        const uploadResponse = await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!uploadResponse.ok) { toast.error(`No fue posible subir ${file.name}.`); continue; }
        created.push({ id: data.attachmentId, uploadUuid: "", originalName: file.name, mimeType: file.type, sizeBytes: file.size, referenceUrl: null });
      }
      const next = [...local, ...created]; setLocal(next); onChange(next.map((item) => item.id));
    } catch { toast.error("No fue posible subir los adjuntos."); } finally { setPending(false); event.target.value = ""; }
  }
  return <div className="space-y-2"><Label htmlFor={`work-log-files-${workLogId ?? "new"}`}>Adjuntos <span className="font-normal text-muted-foreground">(opcional)</span></Label><label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/[0.03] p-4 text-center text-sm text-muted-foreground hover:bg-primary/[0.06]"><span className="font-medium text-primary">Arrastra fotos o videos aquí</span><span className="mt-1 text-xs">o pulsa para seleccionar · máximo 5 archivos de 100 MB</span><input accept={workLogAttachmentMimeTypes.join(",")} className="sr-only" disabled={pending || !workLogId} id={`work-log-files-${workLogId ?? "new"}`} multiple onChange={upload} type="file" /></label>{local.length ? <ul className="space-y-1 text-xs text-muted-foreground">{local.map((attachment) => <li className="truncate rounded-md bg-muted px-2 py-1" key={attachment.id}>{attachment.originalName}</li>)}</ul> : null}<Button className="sr-only" disabled={!workLogId} type="button">{pending ? "Subiendo…" : "Seleccionar archivos"}</Button></div>;
}
