"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { reset: () => void }) {
  return <main className="page-shell"><div className="card-enterprise max-w-xl p-5 sm:p-6"><h1 className="font-display text-lg font-semibold">No fue posible cargar el Registro de tarea</h1><p className="mt-1 text-sm leading-6 text-muted-foreground">Intenta nuevamente sin perder el contexto de tu jornada.</p><Button className="mt-4 w-full sm:w-auto" onClick={reset}>Reintentar</Button></div></main>;
}
