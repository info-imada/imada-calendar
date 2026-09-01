"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarRangeIcon, XIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type ResponsiveDateRangePickerProps = {
  className?: string;
  label: string;
  onChange: (value: DateRange | undefined) => void;
  placeholder?: string;
  value?: DateRange;
};

function rangeLabel(value: DateRange | undefined, placeholder: string) {
  if (!value?.from) return placeholder;
  if (!value.to) return format(value.from, "d MMM yyyy", { locale: es });
  return `${format(value.from, "d MMM", { locale: es })} – ${format(value.to, "d MMM yyyy", { locale: es })}`;
}

export function ResponsiveDateRangePicker({
  className,
  label,
  onChange,
  placeholder = "Todas las fechas",
  value,
}: ResponsiveDateRangePickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const trigger = (
    <Button
      aria-label={label}
      className={cn("w-full justify-start font-normal", !value?.from && "text-muted-foreground", className)}
      type="button"
      variant="outline"
    >
      <CalendarRangeIcon />
      <span className="truncate">{rangeLabel(value, placeholder)}</span>
    </Button>
  );
  const calendar = (
    <Calendar
      captionLayout="dropdown"
      locale={es}
      mode="range"
      numberOfMonths={isMobile ? 1 : 2}
      onSelect={onChange}
      selected={value}
    />
  );
  const actions = (
    <div className="flex items-center justify-between gap-2">
      <Button disabled={!value?.from} onClick={() => onChange(undefined)} size="sm" type="button" variant="ghost">
        <XIcon />
        Limpiar
      </Button>
      <Button disabled={!value?.from || !value.to} onClick={() => setOpen(false)} size="sm" type="button">
        Aplicar rango
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer onOpenChange={setOpen} open={open} showSwipeHandle>
        <DrawerTrigger render={trigger} />
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Seleccionar rango</DrawerTitle>
            <DrawerDescription>{label}</DrawerDescription>
          </DrawerHeader>
          <div className="mx-auto overflow-x-auto px-4">{calendar}</div>
          <DrawerFooter>{actions}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-auto p-3">
        <PopoverHeader className="sr-only">
          <PopoverTitle>Seleccionar rango</PopoverTitle>
        </PopoverHeader>
        {calendar}
        {actions}
      </PopoverContent>
    </Popover>
  );
}

export type { DateRange };
