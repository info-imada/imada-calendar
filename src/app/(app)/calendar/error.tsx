"use client";

import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function CalendarError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="page-shell"><Alert variant="destructive"><AlertTriangleIcon className="size-4" /><AlertTitle>No fue posible cargar el calendario</AlertTitle><AlertDescription className="space-y-3"><p>Verifica la conexión con la base de datos o vuelve a intentarlo.</p><Button onClick={reset} size="sm" variant="outline"><RotateCcwIcon />Reintentar</Button></AlertDescription></Alert></section>;
}
