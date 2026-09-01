import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DetailSection({
  children,
  className,
  icon: Icon,
  title,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  icon?: LucideIcon;
  title: string;
  tone?: "default" | "danger";
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        "space-y-3 rounded-xl border border-border p-4",
        tone === "danger" && "border-destructive/35 bg-destructive/5",
        className,
      )}
      role="region"
    >
      <div className="flex items-center gap-2">
        {Icon ? (
          <Icon
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-muted-foreground",
              tone === "danger" && "text-destructive",
            )}
          />
        ) : null}
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function DetailField({
  icon: Icon,
  label,
  preventWrap = false,
  value,
}: {
  icon?: LucideIcon;
  label: string;
  preventWrap?: boolean;
  value: ReactNode;
}) {
  return (
    <div className="flex min-w-0 gap-2.5">
      {Icon ? (
        <Icon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        />
      ) : null}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div
          className={cn(
            "mt-1 text-sm font-medium text-foreground",
            preventWrap && "whitespace-nowrap",
          )}
        >
          {value ?? "Sin información"}
        </div>
      </div>
    </div>
  );
}

export function DetailBadgeRow({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
      <div
        className="flex flex-wrap items-center gap-2"
        data-testid="detail-badges-primary"
      >
        {primary}
      </div>
      {secondary ? (
        <div
          className="flex flex-wrap items-center gap-2"
          data-testid="detail-badges-secondary"
        >
          {secondary}
        </div>
      ) : null}
    </div>
  );
}
