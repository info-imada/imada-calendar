"use client";

import {
  CalendarDaysIcon,
  Clock3Icon,
  EllipsisIcon,
  LoaderCircleIcon,
  MapPinIcon,
  MessageCircleOffIcon,
  MessageSquareTextIcon,
  PencilIcon,
  Repeat2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import {
  addActivityComment,
  cancelActivity,
  changeActivityStatus,
} from "@/app/actions/activities";
import {
  DetailBadgeRow,
  DetailField,
  DetailSection,
} from "@/components/product/details";
import { ResponsiveSheet } from "@/components/product/forms";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  ActivityPresentation,
  ActivityWorkspaceModel,
} from "@/features/activities/activity-types";
import {
  formatActivityDate,
  formatActivityDateTime,
} from "@/lib/dates/format-activity-date";
import { activityMessages } from "@/messages/common";

type ActivityDetailPanelProps = {
  activity: ActivityPresentation | null;
  model: ActivityWorkspaceModel;
  onEdit: (activity: ActivityPresentation) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function statusClass(code: string) {
  if (code === "COMPLETED") return "status-success";
  if (code === "IN_PROGRESS") return "status-warning";
  if (code === "BLOCKED" || code === "CANCELLED") return "status-danger";
  return "status-info";
}

const auditLabels: Record<string, string> = {
  CREATE_ACTIVITY: "Actividad creada",
  UPDATE_ACTIVITY: "Actividad actualizada",
  REASSIGN_ACTIVITY: "Técnico reasignado",
  CHANGE_ACTIVITY_STATUS: "Estado actualizado",
  CANCEL_ACTIVITY: "Actividad cancelada",
  COMMENT_ACTIVITY: "Comentario agregado",
};

const recurrenceLabels: Record<string, { label: string; unit: string }> = {
  DAILY: { label: "Diaria", unit: "día" },
  MONTHLY: { label: "Mensual", unit: "mes" },
  WEEKLY: { label: "Semanal", unit: "semana" },
};

export function ActivityDetailPanel({
  activity,
  model,
  onEdit,
  onOpenChange,
  open,
}: ActivityDetailPanelProps) {
  const router = useRouter();
  const [statusId, setStatusId] = useState(activity?.status.id ?? "");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!activity) return null;
  const activityId = activity.id;
  const isCancelled = activity.status.code === "CANCELLED";
  const canUpdate = activity.capabilities.canUpdate && !isCancelled;
  const canComment = activity.capabilities.canComment;

  function updateStatus() {
    setError(null);
    startTransition(async () => {
      const result = await changeActivityStatus({
        activityId,
        statusId,
      });
      if (!result.success) {
        setError(activityMessages.feedback.unexpected);
        return;
      }
      toast.success(activityMessages.feedback.statusChanged);
      router.refresh();
    });
  }

  function confirmCancellation() {
    setError(null);
    startTransition(async () => {
      const result = await cancelActivity({ activityId });
      if (!result.success) {
        setError(activityMessages.feedback.unexpected);
        return;
      }
      toast.success(activityMessages.feedback.cancelled);
      setCancelOpen(false);
      onOpenChange(false);
      router.refresh();
    });
  }

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = commentBody.trim();
    if (body.length < 2) {
      setError("Escribe un comentario de al menos 2 caracteres.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addActivityComment({
        activityId,
        body,
      });
      if (!result.success) {
        setError(activityMessages.feedback.unexpected);
        return;
      }
      setCommentBody("");
      toast.success(activityMessages.feedback.commented);
      router.refresh();
    });
  }

  return (
    <>
      <ResponsiveSheet
        ariaLabel={activityMessages.detail.title}
        description={`${activity.type.name} · ${activity.country.name}`}
        heading={activity.title}
        metadata={
          <DetailBadgeRow
            primary={
              <>
                <Badge
                  className={statusClass(activity.status.code)}
                  variant="outline"
                >
                  {activity.status.name}
                </Badge>
                <Badge variant="outline">{activity.priority.name}</Badge>
              </>
            }
            secondary={
              activity.series ? (
                <Badge className="status-subtle" variant="outline">
                  <Repeat2Icon aria-hidden="true" />
                  Recurrente
                </Badge>
              ) : undefined
            }
          />
        }
        onOpenChange={onOpenChange}
        open={open}
        title={activityMessages.detail.title}
      >
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            {error ? (
              <Alert className="mb-4" variant="destructive">
                <AlertTitle>Acción no completada</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Tabs defaultValue="summary">
              <TabsList aria-label="Secciones del detalle" className="w-full">
                <TabsTrigger value="summary">
                  {activityMessages.detail.summary}
                </TabsTrigger>
                <TabsTrigger value="comments">
                  {activityMessages.detail.comments}
                </TabsTrigger>
                {activity.capabilities.canReadAudit ? (
                  <TabsTrigger value="audit">Historial</TabsTrigger>
                ) : null}
              </TabsList>
              <TabsContent className="mt-4 space-y-3" value="summary">
                <DetailSection icon={CalendarDaysIcon} title="Programación">
                  <div className="grid gap-4 min-[520px]:grid-cols-2">
                    <DetailField
                      icon={CalendarDaysIcon}
                      label={activityMessages.form.startsAt}
                      preventWrap
                      value={formatActivityDateTime(activity.startsAt)}
                    />
                    <DetailField
                      icon={Clock3Icon}
                      label={activityMessages.form.endsAt}
                      preventWrap
                      value={formatActivityDateTime(activity.endsAt)}
                    />
                  </div>
                </DetailSection>

                <DetailSection icon={Clock3Icon} title="Registro de tarea">
                  {activity.workLog && activity.capabilities.canOpenWorkLog ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Esta actividad tiene un registro de trabajo enlazado: <span className="font-medium text-foreground">{activity.workLog.status === "COMPLETED" ? "completado" : activity.workLog.status === "COMPLETION_PENDING" ? "finalización marcada" : "en curso"}.</span></p>
                      <Link className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-medium" href={`/work-logs?workLog=${activity.workLog.id}`}>Abrir registro</Link>
                    </div>
                  ) : activity.capabilities.canCreateWorkLog ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Puedes iniciar el control horario para el trabajo ejecutado de esta actividad.</p>
                      <Link className="inline-flex min-h-11 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground" href={`/work-logs?activity=${activity.id}`}>Crear registro</Link>
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No hay un registro de tarea enlazado.</p>}
                </DetailSection>

                <DetailSection
                  icon={MapPinIcon}
                  title="Ubicación y responsable"
                >
                  <div className="grid gap-4 min-[520px]:grid-cols-2">
                    <DetailField
                      icon={MapPinIcon}
                      label="País y equipo"
                      value={
                        <>
                          {activity.country.name} ·{" "}
                          {activity.team?.name ?? "Sin equipo"}
                        </>
                      }
                    />
                    <DetailField
                      icon={UserRoundIcon}
                      label={activityMessages.form.technician}
                      value={
                        activity.assignedTo?.name ||
                        activity.assignedTo?.email ||
                        "Sin técnico asignado"
                      }
                    />
                  </div>
                </DetailSection>

                <DetailSection title="Cliente y parte">
                  <div className="grid gap-4 min-[520px]:grid-cols-2">
                    <DetailField
                      label="Cliente"
                      value={activity.customer?.name ?? "Sin cliente"}
                    />
                    <DetailField
                      label="Número de parte"
                      value={activity.partNumber ?? "Sin número de parte"}
                    />
                  </div>
                  {activity.partUrl ? (
                    <a
                      className="mt-3 block break-all text-sm text-primary underline underline-offset-4"
                      href={activity.partUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Abrir enlace del parte
                    </a>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Sin enlace del parte
                    </p>
                  )}
                </DetailSection>

                <DetailSection title="Descripción">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {activity.description?.trim() || "Sin descripción"}
                  </p>
                </DetailSection>

                {activity.series?.recurrenceRule ? (
                  <DetailSection
                    icon={Repeat2Icon}
                    title={activityMessages.detail.recurrence}
                  >
                    <p className="text-sm leading-6 text-muted-foreground">
                      {(() => {
                        const rule = activity.series.recurrenceRule;
                        const recurrence = recurrenceLabels[rule.frequency] ?? {
                          label: rule.frequency,
                          unit: "periodo",
                        };
                        const plural = rule.interval === 1 ? "" : "s";
                        const end = rule.endsAt
                          ? formatActivityDate(rule.endsAt)
                          : "sin fecha de fin";

                        return `${recurrence.label} · cada ${rule.interval} ${recurrence.unit}${plural} · hasta ${end}`;
                      })()}
                    </p>
                  </DetailSection>
                ) : null}

                <DetailSection
                  icon={ShieldCheckIcon}
                  title="Estado del ciclo de vida"
                  tone={isCancelled ? "danger" : "default"}
                >
                  {isCancelled ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Actividad cerrada
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Esta actividad fue cancelada y ya no admite cambios
                        operativos. Los comentarios y la auditoría permanecen
                        disponibles.
                      </p>
                    </div>
                  ) : canUpdate ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="detail-status">
                          {activityMessages.detail.changeStatus}
                        </Label>
                        <div className="flex flex-col gap-2 min-[420px]:flex-row">
                          <Select
                            onValueChange={(value) => setStatusId(value ?? "")}
                            value={statusId}
                          >
                            <SelectTrigger
                              aria-label={activityMessages.detail.changeStatus}
                              className="w-full"
                              id="detail-status"
                            >
                              <SelectValue
                                placeholder={
                                  activityMessages.detail.changeStatus
                                }
                              >
                                {
                                  model.statuses.find(
                                    (status) => status.id === statusId,
                                  )?.name
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {model.statuses
                                .filter((status) => status.code !== "CANCELLED")
                                .map((status) => (
                                  <SelectItem key={status.id} value={status.id}>
                                    {status.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            disabled={
                              pending || statusId === activity.status.id
                            }
                            onClick={updateStatus}
                            type="button"
                            variant="outline"
                          >
                            {pending ? (
                              <LoaderCircleIcon className="animate-spin" />
                            ) : null}
                            {activityMessages.actions.applyStatus}
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 border-t border-border pt-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                        <Button
                          className="w-full min-[420px]:w-auto"
                          onClick={() => {
                            onOpenChange(false);
                            onEdit(activity);
                          }}
                          type="button"
                        >
                          <PencilIcon /> {activityMessages.actions.edit}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button className="w-full min-[420px]:w-auto" variant="outline" />}
                          >
                            <EllipsisIcon /> Más acciones
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setCancelOpen(true)}
                            >
                              <Trash2Icon /> {activityMessages.actions.cancel}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm leading-6 text-muted-foreground">
                      Tienes acceso de solo lectura a esta actividad.
                    </p>
                  )}
                  <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                    {activityMessages.detail.createdBy}:{" "}
                    {activity.createdBy.name || activity.createdBy.email} ·{" "}
                    {formatActivityDateTime(activity.createdAt)}
                  </p>
                </DetailSection>
              </TabsContent>
              <TabsContent className="mt-4 space-y-3" value="comments">
                {canComment ? (
                  <form onSubmit={submitComment}>
                    <DetailSection
                      icon={MessageSquareTextIcon}
                      title="Nueva nota interna"
                    >
                      <Label htmlFor="activity-comment">Comentario</Label>
                      <Textarea
                        aria-describedby="activity-comment-help"
                        className="control-surface"
                        id="activity-comment"
                        minLength={2}
                        name="body"
                        onChange={(event) => setCommentBody(event.target.value)}
                        placeholder="Escribe una actualización para el equipo..."
                        required
                        value={commentBody}
                      />
                      <p
                        className="text-xs text-muted-foreground"
                        id="activity-comment-help"
                      >
                        {commentBody.trim().length}/2 caracteres mínimos
                      </p>
                      <Button
                        className="w-fit"
                        disabled={pending || commentBody.trim().length < 2}
                        type="submit"
                      >
                        <MessageSquareTextIcon />
                        {activityMessages.actions.addComment}
                      </Button>
                    </DetailSection>
                  </form>
                ) : null}
                {activity.comments.length ? (
                  <div className="space-y-3">
                    {activity.comments.map((comment) => (
                      <article
                        className="rounded-xl border border-border bg-card p-3"
                        key={comment.id}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">
                            {comment.author.name || comment.author.email}
                          </p>
                          <time className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatActivityDateTime(comment.createdAt)}
                          </time>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                          {comment.body}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <MessageCircleOffIcon className="size-4" />
                    <AlertTitle className="italic text-balance text-muted-foreground">
                      {activityMessages.detail.noComments}
                    </AlertTitle>
                  </Alert>
                )}
              </TabsContent>
              {activity.capabilities.canReadAudit ? (
                <TabsContent className="mt-4" value="audit">
                  {activity.audit.length ? (
                    <ol className="space-y-3">
                      {activity.audit.map((entry) => (
                        <li
                          className="flex gap-3 rounded-xl border border-border bg-card p-3"
                          key={entry.id}
                        >
                          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
                            <ShieldCheckIcon className="size-4" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {auditLabels[entry.action] ?? entry.action}
                            </p>
                            <time className="whitespace-nowrap text-xs text-muted-foreground">
                              {formatActivityDateTime(entry.createdAt)}
                            </time>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <Alert>
                      <ShieldCheckIcon className="size-4" />
                      <AlertTitle>{activityMessages.detail.noAudit}</AlertTitle>
                    </Alert>
                  )}
                </TabsContent>
              ) : null}
            </Tabs>
          </div>
        </ScrollArea>
      </ResponsiveSheet>
      <Dialog onOpenChange={setCancelOpen} open={cancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar esta actividad?</DialogTitle>
            <DialogDescription>
              La actividad dejará de bloquear la agenda del técnico y el cambio
              quedará en auditoría.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Volver
            </DialogClose>
            <Button
              disabled={pending}
              onClick={confirmCancellation}
              type="button"
              variant="destructive"
            >
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
