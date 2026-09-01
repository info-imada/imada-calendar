import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ResponsiveDataView({
  className,
  desktop,
  mobile,
}: {
  className?: string;
  desktop: ReactNode;
  mobile: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="hidden md:block" data-testid="desktop-data-view">{desktop}</div>
      <div className="md:hidden" data-testid="mobile-data-view">{mobile}</div>
    </div>
  );
}
