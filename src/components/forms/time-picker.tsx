"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type HourCycle = "12" | "24";

export type TimeOption = {
  label: string;
  value: string;
};

function formatTimeOption(hours: number, minutes: number, hourCycle: HourCycle) {
  const minuteText = String(minutes).padStart(2, "0");
  if (hourCycle === "24") return `${String(hours).padStart(2, "0")}:${minuteText}`;

  const period = hours < 12 ? "a. m." : "p. m.";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minuteText} ${period}`;
}

export function createTimeOptions(interval = 30, hourCycle: HourCycle = "12"): TimeOption[] {
  if (!Number.isInteger(interval) || interval < 1 || interval > 60) {
    throw new RangeError("Time interval must be an integer between 1 and 60 minutes.");
  }

  const options: TimeOption[] = [];
  for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += interval) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    options.push({
      label: formatTimeOption(hours, minutes, hourCycle),
      value: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    });
  }
  return options;
}

type TimePickerProps = {
  className?: string;
  disabled?: boolean;
  hourCycle?: HourCycle;
  id?: string;
  interval?: number;
  label: string;
  onChange: (value: string) => void;
  value: string;
};

export function TimePicker({
  className,
  disabled = false,
  hourCycle = "12",
  id,
  interval = 30,
  label,
  onChange,
  value,
}: TimePickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const options = useMemo(() => createTimeOptions(interval, hourCycle), [hourCycle, interval]);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-time-value="${value}"]`)
        ?.scrollIntoView({ block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, value]);

  function selectTime(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  const trigger = (
    <Button
      aria-label={label}
      className={cn("w-full justify-between font-normal", className)}
      disabled={disabled}
      id={id}
      type="button"
      variant="outline"
    >
      <span className="flex items-center gap-2">
        <Clock3Icon aria-hidden="true" />
        {selectedOption?.label ?? "Seleccionar hora"}
      </span>
      <span aria-hidden="true" className="text-xs text-muted-foreground">
        {hourCycle === "12" ? "12 h" : "24 h"}
      </span>
    </Button>
  );

  const picker = (
    <Command
      className="min-h-0"
      defaultValue={selectedOption ? `${selectedOption.label} ${selectedOption.value}` : undefined}
    >
      <CommandInput aria-label={`Buscar ${label.toLocaleLowerCase()}`} placeholder="Buscar hora…" />
      <CommandList className="max-h-none overflow-hidden">
        <CommandEmpty>No hay horas disponibles.</CommandEmpty>
        <ScrollArea className="h-72">
          <CommandGroup heading="Horario">
            {options.map((option) => (
              <CommandItem
                data-checked={option.value === value}
                data-time-value={option.value}
                key={option.value}
                onSelect={() => selectTime(option.value)}
                value={`${option.label} ${option.value}`}
              >
                <Clock3Icon aria-hidden="true" className="text-muted-foreground" />
                <span className="flex-1 tabular-nums">{option.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </Command>
  );

  if (isMobile) {
    return (
      <Drawer onOpenChange={setOpen} open={open} showSwipeHandle>
        <DrawerTrigger render={trigger} />
        <DrawerContent className="max-h-[88dvh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{label}</DrawerTitle>
            <DrawerDescription>
              Selecciona una hora en intervalos de {interval} minutos.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{picker}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-72 p-1">
        <PopoverHeader className="sr-only">
          <PopoverTitle>{label}</PopoverTitle>
        </PopoverHeader>
        {picker}
      </PopoverContent>
    </Popover>
  );
}
