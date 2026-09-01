"use client";

import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function FormSection({
  children,
  className,
  description,
  density = "default",
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  density?: "default" | "compact";
  title: string;
}) {
  return (
    <section className={cn("min-w-0 space-y-4 overflow-hidden rounded-xl border border-border bg-card p-4", density === "compact" && "form-section-compact space-y-3 p-3", className)}>
      <div>
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("sticky bottom-0 z-10 -mx-4 mt-auto flex min-w-0 flex-col-reverse gap-2 border-t border-border bg-background/96 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur [&>*]:min-h-11 [&>*]:w-full sm:flex-row sm:justify-end sm:[&>*]:w-auto", className)}>
      {children}
    </div>
  );
}

type ResponsiveSheetProps = {
  ariaLabel?: string;
  children: ReactNode;
  description?: string;
  eyebrow?: string;
  heading?: string;
  metadata?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  mobileMode?: "drawer" | "fullscreen";
};

export function ResponsiveSheet({
  ariaLabel,
  children,
  description,
  eyebrow,
  heading,
  metadata,
  onOpenChange,
  open,
  title,
  mobileMode = "drawer",
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer onOpenChange={onOpenChange} open={open} showSwipeHandle>
        <DrawerContent aria-label={ariaLabel ?? title} className={cn("max-h-[96dvh] min-w-0 overflow-hidden", mobileMode === "fullscreen" && "h-dvh! max-h-dvh! rounded-none! border-0!")}>
          <DrawerHeader className="relative min-w-0 gap-1 border-b border-border pr-12 text-left [&>*]:min-w-0">
            {eyebrow ? <p className="label-overline">{eyebrow}</p> : null}
            <DrawerTitle className={cn(heading && "label-overline")}>{title}</DrawerTitle>
            {heading ? (
              <h2 className="font-display text-lg font-semibold text-foreground">
                {heading}
              </h2>
            ) : null}
            {description ? <DrawerDescription>{description}</DrawerDescription> : null}
            {metadata}
            <DrawerClose
              aria-label="Cerrar"
              className="absolute top-2 right-2"
              render={<Button size="icon-sm" variant="ghost" />}
            >
              <XIcon aria-hidden="true" />
            </DrawerClose>
          </DrawerHeader>
          {children}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent aria-label={ariaLabel ?? title} className="w-full! min-w-0 overflow-hidden sm:max-w-2xl!">
        <SheetHeader className="gap-1 border-b border-border pr-12">
          {eyebrow ? <p className="label-overline">{eyebrow}</p> : null}
          <SheetTitle className={cn(heading && "label-overline")}>{title}</SheetTitle>
          {heading ? (
            <h2 className="font-display text-lg font-semibold text-foreground">
              {heading}
            </h2>
          ) : null}
          {description ? <SheetDescription>{description}</SheetDescription> : null}
          {metadata}
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

type ConfirmActionDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  destructive?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

export function ConfirmActionDialog({
  cancelLabel = "Volver",
  confirmLabel = "Confirmar",
  description,
  destructive = false,
  onConfirm,
  onOpenChange,
  open,
  title,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant={destructive ? "destructive" : "default"}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
