"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type ResponsiveDatePickerProps = {
  className?: string;
  disabled?: Matcher | Matcher[];
  id?: string;
  label: string;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
  value?: Date;
};

export function ResponsiveDatePicker({
  className,
  disabled,
  id,
  label,
  onChange,
  placeholder = "Seleccionar fecha",
  value,
}: ResponsiveDatePickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const trigger = (
    <Button
      aria-label={label}
      className={cn("w-full justify-start font-normal", !value && "text-muted-foreground", className)}
      id={id}
      type="button"
      variant="outline"
    >
      <CalendarIcon />
      {value ? format(value, "d MMM yyyy", { locale: es }) : placeholder}
    </Button>
  );
  const calendar = (
    <Calendar
      captionLayout="dropdown"
      disabled={disabled}
      locale={es}
      mode="single"
      onSelect={(date) => {
        onChange(date);
        if (date) setOpen(false);
      }}
      selected={value}
    />
  );

  if (isMobile) {
    return (
      <Drawer onOpenChange={setOpen} open={open} showSwipeHandle>
        <DrawerTrigger render={trigger} />
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{label}</DrawerTitle>
            <DrawerDescription>Selecciona una fecha del calendario.</DrawerDescription>
          </DrawerHeader>
          <div className="mx-auto overflow-x-auto px-4 pb-5">{calendar}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-auto p-2">
        <PopoverHeader className="sr-only">
          <PopoverTitle>{label}</PopoverTitle>
        </PopoverHeader>
        {calendar}
      </PopoverContent>
    </Popover>
  );
}
