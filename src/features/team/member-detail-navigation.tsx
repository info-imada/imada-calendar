"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

const options = [
  { label: "Resumen", value: "summary" },
  { label: "Acceso", value: "permissions" },
  { label: "Configuración avanzada", value: "access" },
] as const;

export function MemberDetailNavigation({
  onValueChange,
  showAdvanced,
  value,
}: {
  onValueChange: (value: string) => void;
  showAdvanced: boolean;
  value: string;
}) {
  const visibleOptions = showAdvanced ? options : options.slice(0, 2);
  return (
    <>
      <div className="min-w-0 space-y-2 sm:hidden">
        <Label htmlFor="member-detail-section">Sección</Label>
        <Select onValueChange={(next) => onValueChange(next ?? "summary")} value={value}>
          <SelectTrigger id="member-detail-section" className="min-h-11 w-full min-w-0" aria-label="Sección del usuario">
            <SelectValue>{visibleOptions.find((option) => option.value === value)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {visibleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <TabsList className={showAdvanced ? "hidden w-full grid-cols-3 sm:grid" : "hidden w-full grid-cols-2 sm:grid"}>
        <TabsTrigger value="summary">Resumen</TabsTrigger>
        <TabsTrigger value="permissions">Acceso</TabsTrigger>
        {showAdvanced ? <TabsTrigger value="access">Configuración</TabsTrigger> : null}
      </TabsList>
    </>
  );
}
