import { LoadingState } from "@/components/product/states";

export default function LoadingContent() {
  return (
    <main className="page-shell">
      <LoadingState className="mx-auto max-w-7xl" label="Cargando contenido" />
    </main>
  );
}
