"use client";

export default function Error({ reset }: { reset: () => void }) {
  return <main className="page-shell"><div className="card-enterprise p-5"><h1 className="font-display text-lg font-semibold">No fue posible cargar el Registro de tarea</h1><p className="mt-1 text-sm text-muted-foreground">Intenta nuevamente sin perder el contexto de tu jornada.</p><button className="mt-4 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground" onClick={reset} type="button">Reintentar</button></div></main>;
}
