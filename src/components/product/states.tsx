import type { ReactNode } from "react";
import { AlertTriangleIcon, InboxIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StateProps = {
  action?: ReactNode;
  className?: string;
  description: string;
  icon?: ReactNode;
  title: string;
};

export function EmptyState({ action, className, description, icon, title }: StateProps) {
  return (
    <div className={cn("flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center", className)}>
      <span className="mb-3 grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground [&_svg]:size-5">
        {icon ?? <InboxIcon aria-hidden="true" />}
      </span>
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ action, className, description, icon, title }: StateProps) {
  return (
    <Alert className={className} variant="destructive">
      {icon ?? <AlertTriangleIcon aria-hidden="true" />}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </AlertDescription>
    </Alert>
  );
}

export function LoadingState({ className, label = "Cargando" }: { className?: string; label?: string }) {
  return (
    <div aria-label={label} className={cn("space-y-3", className)} role="status">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}
