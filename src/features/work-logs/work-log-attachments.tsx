"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WORK_LOG_ATTACHMENT_MAX_BYTES, WORK_LOG_ATTACHMENT_MAX_COUNT, workLogAttachmentMimeTypes } from "@/lib/validations/work-log-attachments";
import type { WorkLogAttachmentPresentation } from "@/features/work-logs/work-log-types";

export function WorkLogAttachments({ workLogId, attachments, onChange }: { workLogId: string | null; attachments: WorkLogAttachmentPresentation[]; onChange: (ids: string[]) => void }) {
  const [pending, setPending] = useState(false);
  const [local, setLocal] = useState(attachments);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  async function upload(files: File[]) {
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
    } catch { toast.error("No fue posible subir los adjuntos."); } finally { setPending(false); }
  }
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    void upload([...(event.target.files ?? [])]);
    event.target.value = "";
  }
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void upload([...event.dataTransfer.files]);
  }
  return <div className="space-y-2"><Label htmlFor={`work-log-files-${workLogId ?? "new"}`}>Adjuntos <span className="font-normal text-muted-foreground">(opcional)</span></Label><div aria-disabled={pending || !workLogId} aria-label="Zona para adjuntar fotos o videos" className={`flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center text-sm transition-colors ${dragging ? "border-primary bg-primary/10" : "border-primary/35 bg-primary/[0.03] hover:bg-primary/[0.06]"}`} onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }} role="button" tabIndex={pending || !workLogId ? -1 : 0}><span className="font-medium text-primary">Arrastra fotos o videos aquí</span><span className="mt-1 text-xs text-muted-foreground">o pulsa para seleccionar · máximo 5 archivos de 100 MB</span><input ref={inputRef} accept={workLogAttachmentMimeTypes.join(",")} className="sr-only" disabled={pending || !workLogId} id={`work-log-files-${workLogId ?? "new"}`} multiple onChange={handleChange} type="file" /></div>{local.length ? <ul aria-label="Archivos adjuntos" className="grid min-w-0 gap-2 sm:grid-cols-2">{local.map((attachment) => <li className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs" key={attachment.id}><span className="min-w-0 truncate">{attachment.originalName}</span><span className="shrink-0 text-muted-foreground">{Math.round(attachment.sizeBytes / 1024)} KB</span></li>)}</ul> : null}<Button className="w-full sm:w-auto" disabled={pending || !workLogId} onClick={() => inputRef.current?.click()} type="button" variant="outline">{pending ? "Subiendo…" : "Seleccionar archivos"}</Button></div>;
}
