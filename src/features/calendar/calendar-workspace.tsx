"use client";

import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  endOfMonth,
  format,
  getDay,
  parse,
  startOfWeek,
  startOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  FilterIcon,
  FilterXIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type EventProps,
  type SlotInfo,
  type View,
} from "react-big-calendar";

import { FilterBar, OperationalToolbar, PageContainer, PageHeader } from "@/components/product/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityFormPanel } from "@/features/activities/activity-form-panel";
import { ActivityDetailPanel } from "@/features/activities/activity-detail-panel";
import type {
  ActivityPresentation,
  ActivityWorkspaceModel,
} from "@/features/activities/activity-types";
import {
  ALL_CALENDAR_FILTER,
  buildCalendarEvents,
  buildTechnicianResources,
  type CalendarEvent,
  type TechnicianResource,
} from "@/features/calendar/calendar-model";
import { useIsMobile } from "@/hooks/use-mobile";

type CalendarMode = "month" | "technician" | "week";

const localizer = dateFnsLocalizer({
  format,
  getDay,
  locales: { es },
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: es }),
});

const messages = {
  allDay: "Todo el día",
  date: "Fecha",
  day: "Día",
  event: "Actividad",
  month: "Mes",
  next: "Siguiente",
  noEventsInRange: "No hay actividades en este rango.",
  previous: "Anterior",
  showMore: (total: number) => `+${total} más`,
  time: "Hora",
  today: "Hoy",
  tomorrow: "Mañana",
  week: "Semana",
  work_week: "Semana laboral",
  yesterday: "Ayer",
};

function getInitialDate(model: ActivityWorkspaceModel) {
  const firstActivity = [...model.activities].sort((left, right) =>
    left.startsAt.localeCompare(right.startsAt),
  )[0];
  return firstActivity ? new Date(firstActivity.startsAt) : new Date();
}

function getCalendarTitle(date: Date, mode: CalendarMode) {
  if (mode === "month") return format(date, "MMMM yyyy", { locale: es });
  if (mode === "week") {
    const firstDay = startOfWeek(date, { locale: es });
    const lastDay = endOfWeek(date, { locale: es });
    return `${format(firstDay, "d MMM", { locale: es })} — ${format(lastDay, "d MMM yyyy", { locale: es })}`;
  }
  return format(date, "EEEE d 'de' MMMM", { locale: es });
}

function moveDate(date: Date, direction: -1 | 1, mode: CalendarMode) {
  if (mode === "month") return addMonths(date, direction);
  if (mode === "week") return addWeeks(date, direction);
  return addDays(date, direction);
}

function getMobileRange(date: Date, mode: CalendarMode) {
  if (mode === "week") {
    return { end: endOfWeek(date, { locale: es }), start: startOfWeek(date, { locale: es }) };
  }
  if (mode === "technician") {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { end, start };
  }
  return { end: endOfMonth(date), start: startOfMonth(date) };
}

function CalendarEventContent({ event }: EventProps<CalendarEvent>) {
  return (
    <div className="min-w-0 leading-tight">
      <p className="truncate font-medium">{event.title}</p>
      <p className="mt-0.5 hidden truncate text-[10px] opacity-80 sm:block">
        {event.activity.assignedTo?.name
          || event.activity.assignedTo?.email
          || "Sin asignar"}
      </p>
    </div>
  );
}

const calendarComponents = { event: CalendarEventContent };
const calendarFormats = {
  dayFormat: (value: Date) => format(value, "EEE d", { locale: es }),
  dayHeaderFormat: (value: Date) => format(value, "EEEE d 'de' MMMM", { locale: es }),
  monthHeaderFormat: (value: Date) => format(value, "MMMM yyyy", { locale: es }),
  timeGutterFormat: (value: Date) => format(value, "HH:mm", { locale: es }),
  weekdayFormat: (value: Date) => format(value, "EEE", { locale: es }),
};
const calendarViews: View[] = ["month", "week", "day"];

function getCalendarEventProps(event: CalendarEvent) {
  return {
    className: `calendar-event-status-${event.activity.status.code.toLocaleLowerCase().replaceAll("_", "-")}`,
    style: {
      borderLeftColor: event.activity.priority.color,
      color: "var(--foreground)",
    },
  };
}

function FilterSelect({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <Select
      onValueChange={(nextValue) => onValueChange(nextValue ?? ALL_CALENDAR_FILTER)}
      value={value}
    >
      <SelectTrigger aria-label={label} className="w-full sm:w-52">
        <SelectValue>{options.find((option) => option.value === value)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CalendarWorkspace({ model }: { model: ActivityWorkspaceModel }) {
  const isMobile = useIsMobile();
  const [countryId, setCountryId] = useState(ALL_CALENDAR_FILTER);
  const [technicianId, setTechnicianId] = useState(ALL_CALENDAR_FILTER);
  const [mode, setMode] = useState<CalendarMode>("month");
  const [date, setDate] = useState(() => getInitialDate(model));
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityPresentation | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityPresentation | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ end: Date; start: Date } | null>(null);

  const events = useMemo(
    () => buildCalendarEvents(model, { countryId, technicianId }),
    [countryId, model, technicianId],
  );
  const visibleEvents = useMemo(() => {
    if (!isMobile) return events;
    const range = getMobileRange(date, mode);
    return events.filter((event) => event.end >= range.start && event.start <= range.end);
  }, [date, events, isMobile, mode]);
  const allResources = useMemo(() => buildTechnicianResources(model), [model]);
  const resources = useMemo(() => {
    if (technicianId === ALL_CALENDAR_FILTER) return allResources;
    return allResources.filter((resource) => resource.id === technicianId);
  }, [allResources, technicianId]);
  const currentView: View = mode === "technician" ? "day" : mode;
  const activeFilterCount = [countryId, technicianId].filter(
    (value) => value !== ALL_CALENDAR_FILTER,
  ).length;
  const noCatalog = !model.countries.length
    || !model.types.length
    || !model.statuses.length
    || !model.priorities.length;

  function openCreate(start?: Date, end?: Date) {
    const nextStart = start ?? (() => {
      const value = new Date(date);
      value.setHours(9, 0, 0, 0);
      return value;
    })();
    const nextEnd = end ?? new Date(nextStart.getTime() + 2 * 60 * 60 * 1000);
    setEditingActivity(null);
    setSelectedSlot({ start: nextStart, end: nextEnd });
    setFormOpen(true);
  }

  function clearFilters() {
    setCountryId(ALL_CALENDAR_FILTER);
    setTechnicianId(ALL_CALENDAR_FILTER);
  }

  return (
    <PageContainer>
      <PageHeader
        actions={
          model.canCreate ? (
            <Button className="w-full sm:w-auto" disabled={noCatalog} onClick={() => openCreate()}>
              <PlusIcon aria-hidden="true" />
              Nueva actividad
            </Button>
          ) : null
        }
        description="Coordina la carga del equipo, detecta huecos y actúa sobre cada actividad sin salir de la agenda."
        eyebrow="Planificación operativa"
        title="Calendario operativo"
        density="compact"
      />

      {noCatalog ? (
        <Alert variant="destructive">
          <CalendarDaysIcon className="size-4" />
          <AlertTitle>Catálogos incompletos</AlertTitle>
          <AlertDescription>Ejecuta el seed o completa los catálogos antes de programar actividades.</AlertDescription>
        </Alert>
      ) : null}

      <OperationalToolbar
        context={
          !isMobile ? <Tabs
            className="w-full shrink-0 sm:w-auto"
            onValueChange={(value) => setMode(value as CalendarMode)}
            value={mode}
          >
            <TabsList aria-label="Vista del calendario" className="grid w-full grid-cols-3 sm:w-auto">
              <TabsTrigger value="month"><CalendarDaysIcon aria-hidden="true" />Mes</TabsTrigger>
              <TabsTrigger value="week"><Clock3Icon aria-hidden="true" />Semana</TabsTrigger>
              <TabsTrigger value="technician"><UsersIcon aria-hidden="true" />Técnicos</TabsTrigger>
            </TabsList>
          </Tabs> : null
        }
        label="Herramientas del calendario"
        meta={
          <span className="text-xs text-muted-foreground">
            {activeFilterCount ? `${activeFilterCount} filtros activos` : "Sin filtros activos"}
          </span>
        }
      >
        <FilterBar
          activeCount={activeFilterCount}
          className="w-full lg:justify-end"
          label="Filtrar calendario"
        >
          <FilterSelect
            label="Filtrar calendario por país"
            onValueChange={setCountryId}
            options={[
              { label: "Todos los países", value: ALL_CALENDAR_FILTER },
              ...model.countries.map((country) => ({ label: country.name, value: country.id })),
            ]}
            value={countryId}
          />
          <FilterSelect
            label="Filtrar calendario por técnico"
            onValueChange={setTechnicianId}
            options={[
              { label: "Todos los técnicos", value: ALL_CALENDAR_FILTER },
              ...allResources.map((resource) => ({ label: resource.title, value: resource.id })),
            ]}
            value={technicianId}
          />
          <Button disabled={!activeFilterCount} onClick={clearFilters} variant="ghost">
            <FilterXIcon aria-hidden="true" />
            Limpiar
          </Button>
        </FilterBar>
      </OperationalToolbar>

      <Card className="card-enterprise overflow-hidden">
        <CardContent className="space-y-4 p-3 sm:p-4 lg:p-5">
          <div className="flex flex-col gap-3 border-y border-border py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-1">
              <Button aria-label="Periodo anterior" onClick={() => setDate((current) => moveDate(current, -1, mode))} size="icon-sm" variant="outline">
                <ChevronLeftIcon aria-hidden="true" />
              </Button>
              <Button onClick={() => setDate(new Date())} size="sm" variant="outline">Hoy</Button>
              <Button aria-label="Periodo siguiente" onClick={() => setDate((current) => moveDate(current, 1, mode))} size="icon-sm" variant="outline">
                <ChevronRightIcon aria-hidden="true" />
              </Button>
              <h2 className="ml-2 min-w-0 truncate capitalize font-display text-base font-semibold sm:text-lg">
                {getCalendarTitle(date, mode)}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{visibleEvents.length} {visibleEvents.length === 1 ? "actividad" : "actividades"}</Badge>
              {mode === "technician" ? (
                <Badge variant="outline">{resources.length} {resources.length === 1 ? "técnico" : "técnicos"}</Badge>
              ) : null}
            </div>
          </div>

          {visibleEvents.length === 0 ? (
            <Alert>
              <FilterIcon className="size-4" />
              <AlertTitle>Sin actividades para estos filtros</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>Cambia los filtros o crea una actividad directamente en el calendario.</p>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={!activeFilterCount} onClick={clearFilters} size="sm" variant="outline">Cambiar filtros</Button>
                  {model.canCreate ? <Button onClick={() => openCreate()} size="sm">Nueva actividad</Button> : null}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {isMobile ? (
            <div className="space-y-6">
              {[...visibleEvents.reduce<Map<string, CalendarEvent[]>>((groups, event) => {
                const key = format(event.start, "yyyy-MM-dd");
                groups.set(key, [...(groups.get(key) ?? []), event]);
                return groups;
              }, new Map())].map(([day, dayEvents]) => (
                <section key={day}>
                  <h2 className="mb-2 text-sm font-semibold capitalize">
                    {format(new Date(`${day}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })}
                  </h2>
                  <div className="divide-y rounded-xl border bg-card">
                    {dayEvents.map((event) => (
                      <Button
                        aria-label={event.title}
                        className="h-auto min-h-16 w-full justify-between gap-3 rounded-none p-3 text-left"
                        key={event.id}
                        onClick={() => { setSelectedActivity(event.activity); setDetailOpen(true); }}
                        type="button"
                        variant="ghost"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{event.title}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {format(event.start, "HH:mm")}–{format(event.end, "HH:mm")} · {event.activity.assignedTo?.name || event.activity.assignedTo?.email || "Sin asignar"}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{event.activity.status.name}</span>
                      </Button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : <div className="calendar-surface" data-mode={mode}>
            <BigCalendar<CalendarEvent, TechnicianResource>
              components={calendarComponents}
              culture="es"
              date={date}
              dayLayoutAlgorithm="no-overlap"
              endAccessor="end"
              eventPropGetter={getCalendarEventProps}
              events={events}
              formats={calendarFormats}
              localizer={localizer}
              longPressThreshold={180}
              messages={messages}
              onDrillDown={(nextDate) => {
                setDate(nextDate);
                setMode("week");
              }}
              onNavigate={setDate}
              onSelectEvent={(event) => {
                setSelectedActivity(event.activity);
                setDetailOpen(true);
              }}
              onSelectSlot={(slot: SlotInfo) => {
                if (model.canCreate) openCreate(slot.start, slot.end);
              }}
              popup
              resourceAccessor="resourceId"
              resourceIdAccessor="id"
              resources={mode === "technician" ? resources : undefined}
              resourceTitleAccessor="title"
              selectable={model.canCreate}
              startAccessor="start"
              step={30}
              timeslots={2}
              toolbar={false}
              view={currentView}
              views={calendarViews}
            />
          </div>}
        </CardContent>
      </Card>

      <ActivityFormPanel
        activity={editingActivity}
        initialEndsAt={selectedSlot?.end}
        initialStartsAt={selectedSlot?.start}
        model={model}
        onOpenChange={setFormOpen}
        open={formOpen}
      />
      <ActivityDetailPanel
        activity={selectedActivity}
        model={model}
        onEdit={(activity) => {
          setDetailOpen(false);
          setSelectedSlot(null);
          setEditingActivity(activity);
          setFormOpen(true);
        }}
        onOpenChange={setDetailOpen}
        open={detailOpen}
      />
    </PageContainer>
  );
}
