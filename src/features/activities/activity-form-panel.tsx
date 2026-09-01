"use client";

import { CalendarClockIcon, LoaderCircleIcon, Repeat2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { createActivity, updateActivity, type ActivityActionResult } from "@/app/actions/activities";
import { ResponsiveDatePicker } from "@/components/forms/responsive-date-picker";
import { TimePicker } from "@/components/forms/time-picker";
import { ConfirmActionDialog, FormActions, FormSection, ResponsiveSheet } from "@/components/product/forms";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityPresentation, ActivityWorkspaceModel } from "@/features/activities/activity-types";
import { combineLocalDateAndTime, endOfSelectedDay, getLocalTimeValue } from "@/lib/dates/form-date-time";
import { validateActivityTimeRange } from "@/lib/dates/validate-activity-time-range";
import { activityMessages } from "@/messages/common";

type ActivityFormPanelProps = {
  activity?: ActivityPresentation | null;
  initialEndsAt?: Date;
  initialStartsAt?: Date;
  model: ActivityWorkspaceModel;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

type SelectOption = { label: string; value: string };

const NONE = "NONE";

function newActivityDates() {
  const startsAt = new Date();
  startsAt.setMinutes(0, 0, 0);
  startsAt.setHours(startsAt.getHours() + 1);
  const endsAt = new Date(startsAt.getTime() + (2 * 60 * 60 * 1000));
  const recurrenceEndsAt = new Date(startsAt.getTime() + (7 * 24 * 60 * 60 * 1000));
  return { startsAt, endsAt, recurrenceEndsAt };
}

function actionErrorMessage(result: Extract<ActivityActionResult, { success: false }>) {
  if (result.errorCode === "CONFLICT") return activityMessages.feedback.conflict;
  if (result.errorCode === "RECURRENCE_LIMIT") return activityMessages.feedback.recurrenceLimit;
  return activityMessages.feedback.unexpected;
}

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <p aria-live="polite" className="text-xs text-destructive" role="alert">{errors[0]}</p> : null;
}

function ActivitySelectField({
  error,
  id,
  label,
  onChange,
  options,
  value,
}: {
  error?: string[];
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select onValueChange={(nextValue) => onChange(nextValue ?? "")} value={value}>
        <SelectTrigger aria-describedby={error?.length ? `${id}-error` : undefined} aria-invalid={Boolean(error?.length)} aria-label={label} className="control-surface w-full" id={id}>
          <SelectValue placeholder={label}>
            {options.find((option) => option.value === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {error?.[0] ? <p aria-live="polite" className="text-xs text-destructive" id={`${id}-error`} role="alert">{error[0]}</p> : null}
    </div>
  );
}

function ActivityForm({
  activity,
  initialEndsAt,
  initialStartsAt,
  model,
  onCompleted,
  onDirtyChange,
  onOpenChange,
}: Omit<ActivityFormPanelProps, "open"> & { onCompleted: () => void; onDirtyChange: (dirty: boolean) => void }) {
  const router = useRouter();
  const [defaults] = useState(newActivityDates);
  const initialStart = activity ? new Date(activity.startsAt) : initialStartsAt ?? defaults.startsAt;
  const initialEnd = activity ? new Date(activity.endsAt) : initialEndsAt ?? defaults.endsAt;
  const defaultStatus = model.statuses.find((status) => status.code === "PLANNED") ?? model.statuses[0];
  const defaultPriority = model.priorities.find((priority) => priority.code === "MEDIUM") ?? model.priorities[0];

  const [title, setTitle] = useState(activity?.title ?? "");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [startsOn, setStartsOn] = useState<Date | undefined>(initialStart);
  const [startsTime, setStartsTime] = useState(getLocalTimeValue(initialStart));
  const [endsOn, setEndsOn] = useState<Date | undefined>(initialEnd);
  const [endsTime, setEndsTime] = useState(getLocalTimeValue(initialEnd));
  const [allDay, setAllDay] = useState(activity?.allDay ?? false);
  const [countryId, setCountryId] = useState(activity?.country.id ?? model.countries[0]?.id ?? "");
  const [teamId, setTeamId] = useState(activity?.team?.id ?? NONE);
  const [customerId, setCustomerId] = useState(activity ? (activity.customer?.id ?? NONE) : (model.customers?.[0]?.id ?? NONE));
  const [typeId, setTypeId] = useState(activity?.type.id ?? model.types[0]?.id ?? "");
  const [statusId, setStatusId] = useState(activity?.status.id ?? defaultStatus?.id ?? "");
  const [priorityId, setPriorityId] = useState(activity?.priority.id ?? defaultPriority?.id ?? "");
  const [assignedToId, setAssignedToId] = useState(activity?.assignedTo?.id ?? NONE);
  const [partNumber, setPartNumber] = useState(activity?.partNumber ?? "");
  const [partUrl, setPartUrl] = useState(activity?.partUrl ?? "");
  const [recurring, setRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceEndsOn, setRecurrenceEndsOn] = useState<Date | undefined>(defaults.recurrenceEndsAt);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const teams = model.countries.find((country) => country.id === countryId)?.teams ?? [];

  function markDirty() {
    onDirtyChange(true);
  }

  function getStepErrors(stepToValidate: number) {
    const nextErrors: Record<string, string[]> = {};
    if (stepToValidate === 1 && title.trim().length < 3) {
      nextErrors.title = ["Indica un título para la actividad."];
    }
    if (stepToValidate === 2) {
      if (!startsOn) nextErrors.startsAt = ["Selecciona la fecha de inicio."];
      if (!endsOn) nextErrors.endsAt = ["Selecciona la fecha de fin."];
    }
    if (stepToValidate === 3) {
      if (!countryId) nextErrors.countryId = ["Selecciona un país."];
      if (!typeId) nextErrors.typeId = ["Selecciona un tipo de actividad."];
      if (!statusId) nextErrors.statusId = ["Selecciona un estado."];
      if (!priorityId) nextErrors.priorityId = ["Selecciona una prioridad."];
      if ((model.customers ?? []).some((customer) => customer.isActive) && customerId === NONE) {
        nextErrors.customerId = ["Selecciona un cliente."];
      }
    }
    return nextErrors;
  }

  function validateStep(stepToValidate: number) {
    const nextErrors = getStepErrors(stepToValidate);
    setFieldErrors(nextErrors);
    return nextErrors;
  }

  function focusFirstError(errors: Record<string, string[] | undefined>) {
    const firstField = Object.keys(errors).find((key) => errors[key]?.length);
    if (!firstField) return;
    const selectors: Record<string, string> = {
      customerId: "#activity-customer",
      countryId: "#activity-country",
      endsAt: "#activity-end-date",
      priorityId: "#activity-priority",
      startsAt: "#activity-start-date",
      statusId: "#activity-status",
      title: "#activity-title",
      typeId: "#activity-type",
    };
    window.setTimeout(() => document.querySelector<HTMLElement>(selectors[firstField] ?? "[aria-invalid='true']")?.focus());
  }

  function goToNextStep() {
    const errors = validateStep(step);
    if (Object.keys(errors).length) {
      setFormError("Completa los campos obligatorios para continuar.");
      focusFirstError(errors);
      return;
    }
    setFormError(null);
    setStep((current) => Math.min(current + 1, 3));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A native submit can still happen when a user presses Enter inside a
    // field. Navigation steps must never persist data; only the final CTA is
    // allowed to reach the server action.
    if (step < 3) {
      goToNextStep();
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (!(submitter instanceof HTMLElement) || submitter.dataset.formSubmit !== "activity-save") {
      return;
    }
    const validationErrors = {
      ...getStepErrors(1),
      ...getStepErrors(2),
      ...getStepErrors(3),
    };
    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      setFormError("Completa los campos obligatorios para guardar.");
      focusFirstError(validationErrors);
      return;
    }
    if (!startsOn || !endsOn || (recurring && !recurrenceEndsOn)) {
      setFormError(activityMessages.feedback.unexpected);
      return;
    }

    let startsAt: Date;
    let endsAt: Date;
    try {
      startsAt = combineLocalDateAndTime(startsOn, startsTime);
      endsAt = combineLocalDateAndTime(endsOn, endsTime);
    } catch {
      setFormError(activityMessages.feedback.unexpected);
      return;
    }

    const timeRange = validateActivityTimeRange({ endsAt, startsAt });
    if (!timeRange.valid) {
      setFieldErrors({ endsAt: [timeRange.message] });
      setFormError(timeRange.message);
      return;
    }

    setFormError(null);
    setFieldErrors({});
    startTransition(async () => {
      const baseInput = {
        title,
        description,
        startsAt,
        endsAt,
        allDay,
        countryId,
        teamId: teamId === NONE ? undefined : teamId,
        typeId,
        statusId,
        priorityId,
        assignedToId: assignedToId === NONE ? undefined : assignedToId,
        customerId: customerId === NONE ? undefined : customerId,
        partNumber: partNumber.trim() || undefined,
        partUrl: partUrl.trim() || undefined,
      };
      const result = activity
        ? await updateActivity({ activityId: activity.id, ...baseInput })
        : await createActivity({
            ...baseInput,
            recurrence: recurring && recurrenceEndsOn ? {
              frequency: recurrenceFrequency,
              interval: Number(recurrenceInterval),
              endsAt: endOfSelectedDay(recurrenceEndsOn),
              timezone: "America/Panama",
            } : undefined,
          });

      if (!result.success) {
        const nextErrors = result.fieldErrors ?? {};
        setFieldErrors(nextErrors);
        setFormError(actionErrorMessage(result));
        const firstField = Object.keys(nextErrors)[0];
        if (firstField) {
          const nextStep = ["title", "description"].includes(firstField) ? 1 : ["startsAt", "endsAt", "allDay"].includes(firstField) ? 2 : 3;
          setStep(nextStep);
          window.setTimeout(() => {
            const selectors: Record<string, string> = {
              assignedToId: "#activity-technician",
              customerId: "#activity-customer",
              countryId: "#activity-country",
              description: "#activity-description",
              priorityId: "#activity-priority",
              statusId: "#activity-status",
              teamId: "#activity-team",
              title: "#activity-title",
              typeId: "#activity-type",
              partNumber: "#activity-part-number",
              partUrl: "#activity-part-url",
            };
            document.querySelector<HTMLElement>(selectors[firstField] ?? "[aria-invalid='true']")?.focus();
          });
        }
        return;
      }

      toast.success(activity ? activityMessages.feedback.updated : activityMessages.feedback.created, {
        description: result.createdCount && result.createdCount > 1 ? `${result.createdCount} ocurrencias creadas` : undefined,
      });
      onDirtyChange(false);
      onCompleted();
      router.refresh();
    });
  }

  const hasActiveCustomers = (model.customers ?? []).some((customer) => customer.isActive);
  const customerRequiredMissing = hasActiveCustomers && customerId === NONE;
  const canSave = Boolean(
    title.trim().length >= 3 && startsOn && endsOn && countryId && typeId && statusId && priorityId &&
      !customerRequiredMissing && (!recurring || recurrenceEndsOn),
  );

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 px-4 pb-5">
          <div aria-label="Progreso del formulario" className="space-y-2 pt-1">
            <p className="text-sm font-medium">Paso {step} de 3</p>
            <div aria-hidden="true" className="grid grid-cols-3 gap-1">
              {[1, 2, 3].map((item) => <span className={item <= step ? "h-1 rounded-full bg-primary" : "h-1 rounded-full bg-muted"} key={item} />)}
            </div>
          </div>
          {formError ? <Alert aria-live="polite" role="alert" variant="destructive"><CalendarClockIcon className="size-4" /><AlertTitle>Revisa el formulario</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert> : null}
          {step === 1 ? <FormSection density="compact" description="Define el trabajo que verá el equipo operativo." title="Actividad">
            <div className="space-y-2">
              <Label htmlFor="activity-title">{activityMessages.form.title}</Label>
              <Input
                aria-describedby={fieldErrors.title?.length ? "activity-title-error" : undefined}
                aria-invalid={Boolean(fieldErrors.title?.length)}
                className="control-surface"
                id="activity-title"
                onChange={(event) => { markDirty(); setTitle(event.target.value); }}
                placeholder="Ej. Mantenimiento preventivo flota Panamá"
                required
                value={title}
              />
              {fieldErrors.title?.[0] ? <p aria-live="polite" className="text-xs text-destructive" id="activity-title-error" role="alert">{fieldErrors.title[0]}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-description">{activityMessages.form.details}</Label>
              <Textarea
                aria-describedby={fieldErrors.description?.length ? "activity-description-error" : undefined}
                aria-invalid={Boolean(fieldErrors.description?.length)}
                className="control-surface"
                id="activity-description"
                onChange={(event) => { markDirty(); setDescription(event.target.value); }}
                placeholder="Describe el trabajo, alcance y resultado esperado"
                rows={3}
                value={description}
              />
              {fieldErrors.description?.[0] ? <p aria-live="polite" className="text-xs text-destructive" id="activity-description-error" role="alert">{fieldErrors.description[0]}</p> : null}
            </div>
          </FormSection> : null}
          {step === 2 ? <FormSection density="compact" description="Selecciona cuándo se realizará el trabajo." title="Fecha y hora">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{activityMessages.form.startsAt}</Label>
                <ResponsiveDatePicker className="control-surface" id="activity-start-date" label={activityMessages.form.startsAt} onChange={(value) => { markDirty(); setStartsOn(value); }} value={startsOn} />
                <TimePicker className="control-surface" disabled={allDay} id="activity-start-time" label="Hora de inicio" onChange={(value) => { markDirty(); setStartsTime(value); }} value={startsTime} />
                <FieldError errors={fieldErrors.startsAt} />
              </div>
              <div className="space-y-2">
                <Label>{activityMessages.form.endsAt}</Label>
                <ResponsiveDatePicker className="control-surface" id="activity-end-date" label={activityMessages.form.endsAt} onChange={(value) => { markDirty(); setEndsOn(value); }} value={endsOn} />
                <TimePicker className="control-surface" disabled={allDay} id="activity-end-time" label="Hora de fin" onChange={(value) => { markDirty(); setEndsTime(value); }} value={endsTime} />
                <FieldError errors={fieldErrors.endsAt} />
              </div>
            </div>
            <div className="flex min-h-9 items-center gap-2 rounded-lg border border-border bg-muted/20 px-3">
              <Checkbox aria-label={activityMessages.form.allDay} checked={allDay} id="activity-all-day" onCheckedChange={(value) => { markDirty(); setAllDay(value); }} />
              <Label htmlFor="activity-all-day">{activityMessages.form.allDay}</Label>
            </div>
          </FormSection> : null}
          {step === 3 ? <FormSection density="compact" description="Asigna territorio, catálogo y responsable." title="Asignación">
            <ActivitySelectField error={customerRequiredMissing ? ["Selecciona un cliente."] : fieldErrors.customerId} id="activity-customer" label="Cliente" onChange={(value) => { markDirty(); setCustomerId(value); }} options={[{ label: "Sin cliente", value: NONE }, ...(model.customers ?? []).map((customer) => ({ label: customer.code ? `${customer.name} · ${customer.code}` : customer.name, value: customer.id }))]} value={customerId} />
            <div className="grid gap-3 sm:grid-cols-2">
            <ActivitySelectField
              error={fieldErrors.countryId}
              id="activity-country"
              label={activityMessages.form.country}
              onChange={(value) => { markDirty(); setCountryId(value); setTeamId(NONE); }}
              options={model.countries.map((country) => ({ label: country.name, value: country.id }))}
              value={countryId}
            />
            <ActivitySelectField
              error={fieldErrors.teamId}
              id="activity-team"
              label={activityMessages.form.team}
              onChange={(value) => { markDirty(); setTeamId(value); }}
              options={[{ label: activityMessages.form.noTeam, value: NONE }, ...teams.map((team) => ({ label: team.name, value: team.id }))]}
              value={teamId}
            />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
            <ActivitySelectField error={fieldErrors.typeId} id="activity-type" label={activityMessages.form.type} onChange={(value) => { markDirty(); setTypeId(value); }} options={model.types.map((item) => ({ label: item.name, value: item.id }))} value={typeId} />
            <ActivitySelectField error={fieldErrors.priorityId} id="activity-priority" label={activityMessages.form.priority} onChange={(value) => { markDirty(); setPriorityId(value); }} options={model.priorities.map((item) => ({ label: item.name, value: item.id }))} value={priorityId} />
            </div>
            <ActivitySelectField
              error={fieldErrors.assignedToId}
              id="activity-technician"
              label={activityMessages.form.technician}
              onChange={(value) => { markDirty(); setAssignedToId(value); }}
              options={[{ label: activityMessages.form.none, value: NONE }, ...model.technicians.map((technician) => ({ label: technician.name || technician.email || "Sin nombre", value: technician.id }))]}
              value={assignedToId}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="activity-part-number">Número de parte (opcional)</Label><Input className="control-surface" id="activity-part-number" onChange={(event) => { markDirty(); setPartNumber(event.target.value); }} placeholder="Ej. 1234" value={partNumber} /><FieldError errors={fieldErrors.partNumber} /></div>
              <div className="space-y-2"><Label htmlFor="activity-part-url">URL del parte (opcional)</Label><Input className="control-surface" id="activity-part-url" onChange={(event) => { markDirty(); setPartUrl(event.target.value); }} placeholder="https://…" type="url" value={partUrl} /><FieldError errors={fieldErrors.partUrl} /></div>
            </div>
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer font-medium">Opciones</summary>
              <div className="mt-4 space-y-4">
                <ActivitySelectField error={fieldErrors.statusId} id="activity-status" label={activityMessages.form.status} onChange={(value) => { markDirty(); setStatusId(value); }} options={model.statuses.filter((item) => item.code !== "CANCELLED").map((item) => ({ label: item.name, value: item.id }))} value={statusId} />
          {!activity ? (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <Checkbox aria-label={activityMessages.form.recurrence} checked={recurring} id="activity-recurring" onCheckedChange={(value) => { markDirty(); setRecurring(value); }} />
                <Repeat2Icon className="size-4 text-primary" />
                <Label htmlFor="activity-recurring">{activityMessages.form.recurrence}</Label>
              </div>
              {recurring ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <ActivitySelectField
                    id="recurrence-frequency"
                    label={activityMessages.form.frequency}
                    onChange={(value) => { markDirty(); setRecurrenceFrequency(value as "DAILY" | "WEEKLY" | "MONTHLY"); }}
                    options={[{ label: "Diaria", value: "DAILY" }, { label: "Semanal", value: "WEEKLY" }, { label: "Mensual", value: "MONTHLY" }]}
                    value={recurrenceFrequency}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="recurrence-interval">{activityMessages.form.interval}</Label>
                    <Input
                      aria-label="Intervalo de recurrencia"
                      className="control-surface"
                      id="recurrence-interval"
                      inputMode="numeric"
                      max={12}
                      min={1}
                      onChange={(event) => { markDirty(); setRecurrenceInterval(event.target.value); }}
                      placeholder="Ej. 1"
                      type="number"
                      value={recurrenceInterval}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{activityMessages.form.recurrenceEndsAt}</Label>
                    <ResponsiveDatePicker className="control-surface" label={activityMessages.form.recurrenceEndsAt} onChange={(value) => { markDirty(); setRecurrenceEndsOn(value); }} value={recurrenceEndsOn} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Alert><Repeat2Icon className="size-4" /><AlertTitle>Edición individual</AlertTitle><AlertDescription>Si pertenece a una serie, este cambio solo afecta esta ocurrencia.</AlertDescription></Alert>
          )}
              </div>
            </details>
          </FormSection> : null}
        </div>
      </ScrollArea>
      <FormActions className="mx-0 mt-0 px-4">
        <Button disabled={pending} onClick={() => step === 1 ? onOpenChange(false) : setStep((current) => current - 1)} type="button" variant="outline">{step === 1 ? "Cerrar" : "Atrás"}</Button>
        {step < 3 ? (
          <Button className="sm:min-w-40" onClick={goToNextStep} type="button">Siguiente</Button>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1 sm:items-end">
            {!canSave ? <p aria-live="polite" className="text-right text-xs text-muted-foreground">Completa los campos obligatorios para guardar.</p> : null}
            <Button className="w-full sm:min-w-40 sm:w-auto" data-form-submit="activity-save" disabled={pending || !canSave} type="submit">{pending ? <LoaderCircleIcon className="animate-spin" /> : null}{activityMessages.actions.save}</Button>
          </div>
        )}
      </FormActions>
    </form>
  );
}

export function ActivityFormPanel(props: ActivityFormPanelProps) {
  const [dirty, setDirty] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const title = props.activity ? activityMessages.form.editTitle : activityMessages.form.createTitle;
  const key = props.activity?.id ?? `${props.initialStartsAt?.toISOString() ?? "new"}-${props.initialEndsAt?.toISOString() ?? "default"}`;
  const form = (
    <ActivityForm
      activity={props.activity}
      initialEndsAt={props.initialEndsAt}
      initialStartsAt={props.initialStartsAt}
      key={key}
      model={props.model}
      onCompleted={() => { setDirty(false); props.onOpenChange(false); }}
      onDirtyChange={setDirty}
      onOpenChange={(open) => {
        if (!open && dirty) setConfirmDiscardOpen(true);
        else props.onOpenChange(open);
      }}
    />
  );

  function handleOpenChange(open: boolean) {
    if (!open && dirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    props.onOpenChange(open);
  }

  return (
    <>
      <ResponsiveSheet description={activityMessages.form.description} mobileMode="fullscreen" onOpenChange={handleOpenChange} open={props.open} title={title}>
        {form}
      </ResponsiveSheet>
      <ConfirmActionDialog
        cancelLabel="Seguir editando"
        confirmLabel="Descartar"
        description="Los cambios realizados en esta actividad se perderán."
        destructive
        onConfirm={() => {
          setDirty(false);
          setConfirmDiscardOpen(false);
          props.onOpenChange(false);
        }}
        onOpenChange={setConfirmDiscardOpen}
        open={confirmDiscardOpen}
        title="Descartar cambios sin guardar"
      />
    </>
  );
}

export type { ActivityFormPanelProps };
