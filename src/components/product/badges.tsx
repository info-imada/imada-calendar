import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SemanticTone = "success" | "warning" | "danger" | "info" | "critical" | "subtle";

const toneClassNames: Record<SemanticTone, string> = {
  success: "status-success",
  warning: "status-warning",
  danger: "status-danger",
  info: "status-info",
  critical: "status-critical",
  subtle: "status-subtle",
};

function SemanticBadge({ className, label, tone }: { className?: string; label: string; tone: SemanticTone }) {
  return <Badge className={cn("max-w-full truncate px-2.5", toneClassNames[tone], className)} variant="outline">{label}</Badge>;
}

export function StatusBadge(props: { className?: string; label: string; tone: SemanticTone }) {
  return <SemanticBadge {...props} />;
}

export function PriorityBadge(props: { className?: string; label: string; tone: SemanticTone }) {
  return <SemanticBadge {...props} />;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toLocaleUpperCase();
}

export function UserAvatar({ className, image, name }: { className?: string; image?: string | null; name: string }) {
  return (
    <Avatar className={cn("size-8", className)}>
      {image ? <AvatarImage alt="" src={image} /> : null}
      <AvatarFallback className="bg-primary/12 text-xs font-semibold text-primary">{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
