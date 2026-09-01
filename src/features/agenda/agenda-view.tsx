"use client";

import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  EllipsisIcon,
  FilterXIcon,
  GripVerticalIcon,
  ListIcon,
  MoveRightIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";

import { changeActivityStatus } from "@/app/actions/activities";
import {
  ResponsiveDateRangePicker,
  type DateRange,
} from "@/components/forms/responsive-date-range-picker";
import {
  PriorityBadge,
  StatusBadge,
  UserAvatar,
  type SemanticTone,
} from "@/components/product/badges";
import {
  FilterBar,
  OperationalToolbar,
  PageContainer,
  PageHeader,
} from "@/components/product/page";
import { EmptyState } from "@/components/product/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityDetailPanel } from "@/features/activities/activity-detail-panel";
import { ActivityFormPanel } from "@/features/activities/activity-form-panel";
import type {
  ActivityCatalogItem,
  ActivityPresentation,
  ActivityWorkspaceModel,
} from "@/features/activities/activity-types";
import {
  AGENDA_VIEW_STORAGE_KEY,
  AGENDA_VIEW_STORAGE_EVENT,
  applyAgendaStatus,
  isAgendaViewMode,
  matchesAgendaQuickFilter,
  type AgendaQuickFilter,
  type AgendaViewMode,
} from "@/features/agenda/agenda-state";
import { formatActivityDateTime } from "@/lib/dates/format-activity-date";
import { cn } from "@/lib/utils";
import { agendaMessages } from "@/messages/common";

type AgendaViewProps = {
  initialActivityId?: string;
  model: ActivityWorkspaceModel;
};

function subscribeToAgendaView(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(AGENDA_VIEW_STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(AGENDA_VIEW_STORAGE_EVENT, callback);
  };
}

function getAgendaViewSnapshot(): AgendaViewMode {
  const stored = window.localStorage.getItem(AGENDA_VIEW_STORAGE_KEY);
  return isAgendaViewMode(stored) ? stored : "list";
}

function getServerAgendaViewSnapshot(): AgendaViewMode {
  return "list";
}

function statusTone(code: string): SemanticTone {
  if (code === "COMPLETED") return "success";
  if (code === "IN_PROGRESS") return "warning";
  if (code === "BLOCKED") return "danger";
  return "info";
}

function priorityTone(code: string): SemanticTone {
  if (code === "CRITICAL") return "critical";
  if (code === "HIGH") return "warning";
  if (code === "LOW") return "subtle";
  return "info";
}

function technicianName(activity: ActivityPresentation) {
  return (
    activity.assignedTo?.name || activity.assignedTo?.email || "Sin asignar"
  );
}

function formatDuration(activity: ActivityPresentation) {
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(activity.endsAt).getTime() -
        new Date(activity.startsAt).getTime()) /
        60_000,
    ),
  );
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

function ActivityActions({
  activity,
  onMove,
  onOpen,
  statuses,
}: {
  activity: ActivityPresentation;
  onMove: (activityId: string, status: ActivityCatalogItem) => void;
  onOpen: (activity: ActivityPresentation) => void;
  statuses: ActivityCatalogItem[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Acciones de ${activity.title}`}
            className="shrink-0"
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <EllipsisIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => onOpen(activity)}>
          <ClipboardListIcon aria-hidden="true" />
          Abrir detalle
        </DropdownMenuItem>
        {activity.capabilities.canUpdate ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Mover actividad</DropdownMenuLabel>
              {statuses.map((status) => (
                <DropdownMenuItem
                  disabled={status.id === activity.status.id}
                  key={status.id}
                  onClick={() => onMove(activity.id, status)}
                >
                  <MoveRightIcon aria-hidden="true" />
                  Mover a {status.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActivityCard({
  activity,
  onMove,
  onOpen,
  statuses,
}: {
  activity: ActivityPresentation;
  onMove: (activityId: string, status: ActivityCatalogItem) => void;
  onOpen: (activity: ActivityPresentation) => void;
  statuses: ActivityCatalogItem[];
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform } =
    useDraggable({
      id: `activity:${activity.id}`,
      data: { activityId: activity.id },
      disabled: !activity.capabilities.canUpdate,
    });
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <Card
      className={cn(
        "border-border/80 bg-card py-0 shadow-sm transition-[opacity,box-shadow,transform]",
        isDragging && "z-20 opacity-60 shadow-xl",
      )}
      ref={setNodeRef}
      style={style}
    >
      <CardContent className="space-y-3 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <PriorityBadge
            label={activity.priority.name}
            tone={priorityTone(activity.priority.code)}
          />
          <div className="flex items-center">
            {activity.capabilities.canUpdate ? (
              <Button
                {...attributes}
                {...listeners}
                aria-label={`Arrastrar ${activity.title}`}
                className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
                size="icon-sm"
                variant="ghost"
              >
                <GripVerticalIcon aria-hidden="true" />
              </Button>
            ) : null}
            <ActivityActions
              activity={activity}
              onMove={onMove}
              onOpen={onOpen}
              statuses={statuses}
            />
          </div>
        </div>
        <button
          className="block w-full text-left"
          onClick={() => onOpen(activity)}
          type="button"
        >
          <span className="line-clamp-2 font-medium leading-snug">
            {activity.title}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {formatActivityDateTime(activity.startsAt)} ·{" "}
            {formatDuration(activity)}
          </span>
        </button>
        <div className="flex items-center gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          <UserAvatar className="size-7" name={technicianName(activity)} />
          <span className="min-w-0 flex-1 truncate">
            {technicianName(activity)}
          </span>
          <span className="font-mono text-[0.6875rem]">
            {activity.country.code}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusColumn({
  activities,
  onMove,
  onOpen,
  status,
  statuses,
}: {
  activities: ActivityPresentation[];
  onMove: (activityId: string, status: ActivityCatalogItem) => void;
  onOpen: (activity: ActivityPresentation) => void;
  status: ActivityCatalogItem;
  statuses: ActivityCatalogItem[];
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `status:${status.id}`,
    data: { statusId: status.id },
  });

  return (
    <section
      className={cn(
        "min-h-72 rounded-xl border border-border bg-muted/25 p-3 transition-colors",
        isOver && "border-primary/50 bg-primary/5",
      )}
      data-testid={`status-column-${status.code}`}
      ref={setNodeRef}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h2 className="truncate font-display text-sm font-semibold">
            {status.name}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activities.length === 1
              ? "1 actividad"
              : `${activities.length} actividades`}
          </p>
        </div>
        <StatusBadge
          label={String(activities.length)}
          tone={statusTone(status.code)}
        />
      </div>
      <div className="space-y-3">
        {activities.map((activity) => (
          <ActivityCard
            activity={activity}
            key={activity.id}
            onMove={onMove}
            onOpen={onOpen}
            statuses={statuses}
          />
        ))}
        {!activities.length ? (
          <div className="grid min-h-28 place-items-center rounded-lg border border-dashed border-border bg-background/50 px-4 text-center text-xs text-muted-foreground">
            Arrastra una actividad aquí
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ActivityKanban({
  activities,
  onMove,
  onOpen,
  statuses,
}: {
  activities: ActivityPresentation[];
  onMove: (activityId: string, status: ActivityCatalogItem) => void;
  onOpen: (activity: ActivityPresentation) => void;
  statuses: ActivityCatalogItem[];
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const activityId = event.active.data.current?.activityId;
    const statusId = event.over?.data.current?.statusId;
    const status = statuses.find((item) => item.id === statusId);
    if (typeof activityId === "string" && status) onMove(activityId, status);
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      id="agenda-kanban"
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statuses.map((status) => (
          <div className="snap-start" key={status.id}>
            <StatusColumn
              activities={activities.filter(
                (activity) => activity.status.id === status.id,
              )}
              onMove={onMove}
              onOpen={onOpen}
              status={status}
              statuses={statuses}
            />
          </div>
        ))}
      </div>
    </DndContext>
  );
}

function ActivityList({
  activities,
  onMove,
  onOpen,
  statuses,
}: {
  activities: ActivityPresentation[];
  onMove: (activityId: string, status: ActivityCatalogItem) => void;
  onOpen: (activity: ActivityPresentation) => void;
  statuses: ActivityCatalogItem[];
}) {
  const groups = activities
    .slice()
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    .reduce<Map<string, ActivityPresentation[]>>((result, activity) => {
      const key = activity.startsAt.slice(0, 10);
      result.set(key, [...(result.get(key) ?? []), activity]);
      return result;
    }, new Map());

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([date, groupedActivities]) => (
        <section aria-labelledby={`agenda-date-${date}`} key={date}>
          <h2 className="mb-2 text-sm font-semibold capitalize" id={`agenda-date-${date}`}>
            {new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "UTC", weekday: "long" }).format(new Date(`${date}T12:00:00Z`))}
          </h2>
          <div className="divide-y rounded-xl border bg-card">
            {groupedActivities.map((activity) => (
              <article className={cn("flex min-h-20 items-center gap-3 p-3 sm:p-4", activity.status.code === "CANCELLED" && "opacity-60")} key={activity.id}>
                <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(activity)} type="button">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{activity.title}</span>
                    <StatusBadge label={activity.status.name} tone={statusTone(activity.status.code)} />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {formatActivityDateTime(activity.startsAt)} · {technicianName(activity)}{activity.customer ? ` · ${activity.customer.name}` : ""}
                  </span>
                </button>
                <ActivityActions activity={activity} onMove={onMove} onOpen={onOpen} statuses={statuses} />
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FilterSelect({
  allLabel,
  className,
  items,
  label,
  onChange,
  value,
}: {
  allLabel: string;
  className?: string;
  items: { id: string; label: string }[];
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Select onValueChange={(next) => onChange(next ?? "ALL")} value={value}>
      <SelectTrigger aria-label={label} className={cn("w-full min-w-0", className)}>
        <SelectValue>
          {value === "ALL"
            ? allLabel
            : items.find((item) => item.id === value)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">{allLabel}</SelectItem>
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AgendaView({ initialActivityId, model }: AgendaViewProps) {
  const router = useRouter();
  const [isPersisting, startPersisting] = useTransition();
  const [activities, setActivities] = useState(model.activities);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("ALL");
  const [technician, setTechnician] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [quickFilter, setQuickFilter] = useState<AgendaQuickFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>();
  const view = useSyncExternalStore(
    subscribeToAgendaView,
    getAgendaViewSnapshot,
    getServerAgendaViewSnapshot,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityPresentation | null>(null);
  const [detailOpen, setDetailOpen] = useState(Boolean(initialActivityId));
  const [selectedId, setSelectedId] = useState<string | null>(initialActivityId ?? null);

  const operationalStatuses = useMemo(
    () => model.statuses.filter((item) => item.code !== "CANCELLED"),
    [model.statuses],
  );
  const operationalActivities = activities;
  const filteredActivities = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const from = dateRange?.from ? new Date(dateRange.from) : null;
    const to = dateRange?.to ? new Date(dateRange.to) : null;
    from?.setHours(0, 0, 0, 0);
    to?.setHours(23, 59, 59, 999);

    return operationalActivities.filter((activity) => {
      const startsAt = new Date(activity.startsAt);
      const matchesQuery =
        !normalized ||
        [
          activity.title,
          activity.country.name,
          activity.country.code,
          activity.customer?.name ?? "",
          technicianName(activity),
        ].some((value) => value.toLocaleLowerCase().includes(normalized));
      return (
        matchesQuery &&
        (country === "ALL" || activity.country.id === country) &&
        (technician === "ALL" || activity.assignedTo?.id === technician) &&
        (status === "ALL" || activity.status.id === status) &&
        (priority === "ALL" || activity.priority.id === priority) &&
        matchesAgendaQuickFilter(activity, quickFilter, model.currentUserId, new Date()) &&
        (!from || startsAt >= from) &&
        (!to || startsAt <= to)
      );
    });
  }, [country, dateRange, model.currentUserId, operationalActivities, priority, query, quickFilter, status, technician]);

  const selectedActivity =
    activities.find((activity) => activity.id === selectedId) ?? null;
  const now = new Date();
  const todayStart = new Date(now);
  const todayEnd = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  todayEnd.setHours(23, 59, 59, 999);
  const todayCount = operationalActivities.filter((activity) => {
    const start = new Date(activity.startsAt);
    return start >= todayStart && start <= todayEnd;
  }).length;
  const quickFilters: { count: number; label: string; value: AgendaQuickFilter }[] = [
    { count: todayCount, label: "Hoy", value: "today" },
    {
      count: operationalActivities.filter((activity) => activity.assignedTo?.id === model.currentUserId).length,
      label: "Mis actividades",
      value: "mine",
    },
    ...(operationalActivities.some((activity) => activity.capabilities.canUpdate)
      ? [{ count: operationalActivities.filter((activity) => !activity.assignedTo).length, label: "Sin asignar", value: "unassigned" as const }]
      : []),
    {
      count: operationalActivities.filter((activity) => activity.status.code !== "COMPLETED" && activity.status.code !== "CANCELLED").length,
      label: "Pendientes",
      value: "pending",
    },
  ];
  const activeFilterCount =
    [country, technician, status, priority].filter((item) => item !== "ALL").length +
    (query ? 1 : 0) +
    (dateRange?.from ? 1 : 0);

  function setPreferredView(nextView: AgendaViewMode) {
    window.localStorage.setItem(AGENDA_VIEW_STORAGE_KEY, nextView);
    window.dispatchEvent(new Event(AGENDA_VIEW_STORAGE_EVENT));
  }

  function clearFilters() {
    setQuery("");
    setCountry("ALL");
    setTechnician("ALL");
    setStatus("ALL");
    setPriority("ALL");
    setQuickFilter("all");
    setDateRange(undefined);
  }

  function openDetail(activity: ActivityPresentation) {
    setSelectedId(activity.id);
    setDetailOpen(true);
  }

  function moveActivity(activityId: string, nextStatus: ActivityCatalogItem) {
    const selectedActivity = activities.find(
      (activity) => activity.id === activityId,
    );
    if (!selectedActivity?.capabilities.canUpdate) return;
    const previousStatus = selectedActivity.status;
    if (!previousStatus || previousStatus.id === nextStatus.id || isPersisting)
      return;

    setActivities((current) =>
      applyAgendaStatus(current, activityId, nextStatus),
    );
    startPersisting(async () => {
      const result = await changeActivityStatus({
        activityId,
        statusId: nextStatus.id,
      });
      if (!result.success) {
        setActivities((current) =>
          applyAgendaStatus(current, activityId, previousStatus),
        );
        toast.error("No se pudo cambiar el estado", {
          description: "Se restauró la actividad a su columna anterior.",
        });
        return;
      }

      toast.success("Estado actualizado", {
        description: `La actividad ahora está ${nextStatus.name.toLocaleLowerCase()}.`,
      });
      router.refresh();
    });
  }

  const emptyTitle = operationalActivities.length
    ? "No hay actividades para estos filtros"
    : "Aún no hay actividades";
  const emptyDescription = operationalActivities.length
    ? "Ajusta los filtros o limpia la búsqueda para recuperar resultados."
    : "Crea la primera actividad para comenzar a coordinar al equipo.";

  return (
    <PageContainer>
      <PageHeader
        density="compact"
        actions={
          model.canCreate ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => { setEditingActivity(null); setFormOpen(true); }}
            >
              <PlusIcon aria-hidden="true" />
              {agendaMessages.actions.create}
            </Button>
          ) : null
        }
        description={agendaMessages.description}
        eyebrow={agendaMessages.eyebrow}
        meta={
          isPersisting ? (
            <span className="text-xs text-muted-foreground">Guardando…</span>
          ) : null
        }
        title={agendaMessages.title}
      />

      <div aria-label="Filtros rápidos" className="flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <Button
            aria-pressed={quickFilter === filter.value}
            key={filter.value}
            onClick={() => setQuickFilter((current) => current === filter.value ? "all" : filter.value)}
            variant={quickFilter === filter.value ? "default" : "outline"}
          >
            {filter.label} <span className="tabular-nums">{filter.count}</span>
          </Button>
        ))}
      </div>

      <Tabs
        onValueChange={(next) =>
          isAgendaViewMode(next) && setPreferredView(next)
        }
        value={view}
      >
        <OperationalToolbar
          context={
            <TabsList aria-label={agendaMessages.views.label}>
              <TabsTrigger value="list">
                <ListIcon aria-hidden="true" />
                {agendaMessages.views.list}
              </TabsTrigger>
              <TabsTrigger aria-label="Por estado" value="kanban">
                <ClipboardListIcon aria-hidden="true" />
                Estado
              </TabsTrigger>
            </TabsList>
          }
          label="Herramientas de agenda"
          meta={
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <UsersIcon aria-hidden="true" className="size-4" />
              {filteredActivities.length} actividades
            </p>
          }
        >
          <FilterBar
            activeCount={activeFilterCount}
            className="agenda-filter-grid w-full sm:grid sm:grid-cols-2 xl:grid-cols-[minmax(13rem,2fr)_repeat(4,minmax(8rem,1fr))_12rem_auto]"
            label="Filtrar agenda"
          >
            <div className="agenda-filter-search relative min-w-0 sm:col-span-2 xl:col-span-1">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Buscar agenda"
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={agendaMessages.filters.searchPlaceholder}
                value={query}
              />
            </div>
            <FilterSelect
              allLabel="Todos los países"
              items={model.countries.map((item) => ({
                id: item.id,
                label: item.name,
              }))}
              label="Todos los países"
              onChange={setCountry}
              value={country}
            />
            <FilterSelect
              allLabel="Todos los técnicos"
              items={model.technicians.map((item) => ({
                id: item.id,
                label: item.name || item.email || "Sin nombre",
              }))}
              label="Todos los técnicos"
              onChange={setTechnician}
              value={technician}
            />
            <FilterSelect
              allLabel="Todos los estados"
              items={operationalStatuses.map((item) => ({
                id: item.id,
                label: item.name,
              }))}
              label="Todos los estados"
              onChange={setStatus}
              value={status}
            />
            <FilterSelect
              allLabel="Todas las prioridades"
              items={model.priorities.map((item) => ({ id: item.id, label: item.name }))}
              label="Todas las prioridades"
              onChange={setPriority}
              value={priority}
            />
            <ResponsiveDateRangePicker
              className="w-full min-w-0"
              label="Seleccionar rango de fechas"
              onChange={setDateRange}
              value={dateRange}
            />
            <Button
              className="w-full xl:w-auto"
              disabled={!activeFilterCount}
              onClick={clearFilters}
              variant="ghost"
            >
              <FilterXIcon aria-hidden="true" />
              Limpiar
            </Button>
          </FilterBar>
        </OperationalToolbar>
        {!filteredActivities.length ? (
          <EmptyState
            action={model.canCreate || operationalActivities.length ? (
              <Button
                onClick={() =>
                  operationalActivities.length
                    ? clearFilters()
                    : setFormOpen(true)
                }
                variant="outline"
              >
                {operationalActivities.length
                  ? "Limpiar filtros"
                  : "Nueva actividad"}
              </Button>
            ) : undefined}
            description={emptyDescription}
            icon={<CalendarDaysIcon aria-hidden="true" />}
            title={emptyTitle}
          />
        ) : (
          <>
            <TabsContent value="list">
              <ActivityList
                activities={filteredActivities}
                onMove={moveActivity}
                onOpen={openDetail}
                statuses={operationalStatuses}
              />
            </TabsContent>
            <TabsContent value="kanban">
              <ActivityKanban
                activities={filteredActivities}
                onMove={moveActivity}
                onOpen={openDetail}
                statuses={operationalStatuses}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      <ActivityFormPanel
        activity={editingActivity}
        model={model}
        onOpenChange={setFormOpen}
        open={formOpen}
      />
      <ActivityDetailPanel
        activity={selectedActivity}
        key={selectedActivity?.id ?? "none"}
        model={model}
        onEdit={(activity) => {
          setDetailOpen(false);
          setEditingActivity(activity);
          setFormOpen(true);
        }}
        onOpenChange={setDetailOpen}
        open={detailOpen}
      />
    </PageContainer>
  );
}
