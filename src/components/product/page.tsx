"use client";

import type { ReactNode } from "react";
import { SlidersHorizontalIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <section className={cn("page-shell min-w-0", className)}>
      {children}
    </section>
  );
}

type PageHeaderProps = {
  actions?: ReactNode;
  description: string;
  density?: "default" | "compact";
  eyebrow?: string;
  meta?: ReactNode;
  title: string;
};

export function PageHeader({ actions, description, density = "default", eyebrow, meta, title }: PageHeaderProps) {
  return (
    <header className={cn("flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", density === "compact" && "page-header-compact")}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <p className={cn("label-overline mb-2", density === "compact" && "mb-1")}>{eyebrow}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className={cn("font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl", density === "compact" && "page-heading-compact text-2xl sm:text-2xl")}>
            {title}
          </h1>
          {meta}
        </div>
        <p className={cn("mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] hidden md:block", density === "compact" && "mt-1 leading-5 sm:text-sm")}>
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto lg:justify-end *:w-full sm:*:w-auto">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function PageToolbar({ children, className }: PageContainerProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center", className)}>
      {children}
    </div>
  );
}

type OperationalToolbarProps = {
  children?: ReactNode;
  className?: string;
  context?: ReactNode;
  controlsClassName?: string;
  label?: string;
  meta?: ReactNode;
};

export function OperationalToolbar({
  children,
  className,
  context,
  controlsClassName,
  label = "Herramientas operativas",
  meta,
}: OperationalToolbarProps) {
  return (
    <div
      aria-label={label}
      className={cn("flex min-w-0 flex-col gap-3", className)}
      data-slot="operational-toolbar"
      role="toolbar"
    >
      {context || meta ? (
        <div
          className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          data-slot="operational-toolbar-context"
        >
          <div className="min-w-0">{context}</div>
          {meta ? (
            <div className="shrink-0 text-sm text-muted-foreground">{meta}</div>
          ) : null}
        </div>
      ) : null}
      {children ? (
        <div
          className={cn(
            "flex min-w-0 flex-col gap-2 border-t border-border-subtle pt-3 sm:flex-row sm:flex-wrap sm:items-center",
            controlsClassName,
          )}
          data-slot="operational-toolbar-controls"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export type StatSummaryItem = {
  helper?: string;
  icon?: ReactNode;
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  value: ReactNode;
};

const statToneClassNames = {
  default: "bg-muted text-muted-foreground",
  success: "status-success",
  warning: "status-warning",
  danger: "status-danger",
  info: "status-info",
} as const;

export function StatSummary({ className, items, variant = "cards" }: { className?: string; items: StatSummaryItem[]; variant?: "cards" | "pills" }) {
  if (variant === "pills") {
    return (
      <dl aria-label="Resumen operativo" className={cn("intentional-scroll flex min-w-0 items-center gap-(--stat-pill-gap) pb-1", className)}>
        {items.map((item) => (
          <div className="stat-pill flex shrink-0 items-center gap-2" data-slot="stat-pill" key={item.label}>
            {item.icon ? <span className={cn("grid size-5 shrink-0 place-items-center rounded-md [&_svg]:size-3", statToneClassNames[item.tone ?? "default"])}>{item.icon}</span> : null}
            <dt className="max-w-32 truncate text-xs font-medium text-muted-foreground">{item.label}</dt>
            <dd className="font-display text-base font-semibold tabular-nums">{item.value}</dd>
            {item.helper ? <span className="sr-only">{item.helper}</span> : null}
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={cn("grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <div className="card-enterprise min-w-0 p-3 sm:p-4" key={item.label}>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
            {item.icon ? (
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg [&_svg]:size-3.5", statToneClassNames[item.tone ?? "default"])}>
                {item.icon}
              </span>
            ) : null}
            <dt className="truncate">{item.label}</dt>
          </div>
          <dd className="mt-2 font-display text-2xl font-semibold tabular-nums sm:text-3xl">{item.value}</dd>
          {item.helper ? <p className="mt-1 truncate text-xs text-muted-foreground">{item.helper}</p> : null}
        </div>
      ))}
    </dl>
  );
}

type FilterBarProps = {
  activeCount?: number;
  children: ReactNode;
  className?: string;
  description?: string;
  label?: string;
  title?: string;
};

export function FilterBar({
  activeCount = 0,
  children,
  className,
  description = "Ajusta los criterios para encontrar la información que necesitas.",
  label = "Abrir filtros",
  title = "Filtros",
}: FilterBarProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div
        aria-label={title}
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-2 bg-transparent p-0",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger render={<Button className="w-full justify-between" variant="outline" />}>
        <span className="flex items-center gap-2"><SlidersHorizontalIcon aria-hidden="true" />{label}</span>
        {activeCount ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{activeCount}</span> : null}
      </DrawerTrigger>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="text-left">
          <div className="flex items-start justify-between gap-3">
            <div><DrawerTitle>{title}</DrawerTitle><DrawerDescription>{description}</DrawerDescription></div>
            <DrawerClose render={<Button aria-label="Cerrar filtros" size="icon" variant="ghost" />}><XIcon aria-hidden="true" /></DrawerClose>
          </div>
        </DrawerHeader>
        <div className="grid gap-3 overflow-y-auto px-4 pb-4">{children}</div>
        <DrawerFooter className="border-t border-border pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DrawerClose render={<Button variant="outline" />}>Ver resultados</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
