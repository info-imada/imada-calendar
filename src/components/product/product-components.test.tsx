import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PriorityBadge, StatusBadge, UserAvatar } from "@/components/product/badges";
import { ResponsiveDataView } from "@/components/product/data-view";
import { FormActions, FormSection } from "@/components/product/forms";
import {
  FilterBar,
  OperationalToolbar,
  PageContainer,
  PageHeader,
  StatSummary,
} from "@/components/product/page";
import { EmptyState, ErrorState, LoadingState } from "@/components/product/states";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

describe("product presentation components", () => {
  it("provides one semantic page hierarchy and compact operational metrics", () => {
    render(
      <PageContainer>
        <PageHeader
          description="Coordina el trabajo de campo."
          eyebrow="Operación"
          title="Agenda del equipo"
        />
        <StatSummary
          items={[
            { helper: "Programadas para hoy", label: "Actividades", value: 5 },
            { helper: "Requieren coordinación", label: "Sin asignar", value: 1 },
          ]}
        />
      </PageContainer>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Agenda del equipo" })).toBeVisible();
    expect(screen.getByText("Actividades")).toBeVisible();
    expect(screen.getByText("5")).toHaveClass("tabular-nums");
  });

  it("renders the compact header and KPI pill variants", () => {
    render(
      <>
        <PageHeader density="compact" description="Descripción" eyebrow="OPERACIÓN" title="Agenda" />
        <StatSummary items={[{ label: "Hoy", value: 3 }]} variant="pills" />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Agenda" })).toHaveClass("page-heading-compact");
    expect(screen.getByRole("heading", { name: "Agenda" }).closest("header")).toHaveClass("page-header-compact");
    expect(screen.getByText("Hoy").closest("[data-slot=stat-pill]")).toHaveClass("stat-pill");
  });

  it("makes primary page actions full-width on narrow screens", () => {
    render(
      <PageHeader
        actions={<button type="button">Nueva actividad</button>}
        description="Coordina el trabajo de campo."
        title="Agenda"
      />,
    );

    expect(screen.getByRole("button", { name: "Nueva actividad" }).parentElement).toHaveClass("*:w-full", "sm:*:w-auto");
  });

  it("separates toolbar context from controls without a card surface", () => {
    render(
      <OperationalToolbar
        context={<button type="button">Lista</button>}
        label="Herramientas de agenda"
        meta={<span>4 actividades</span>}
      >
        <input aria-label="Buscar agenda" />
      </OperationalToolbar>,
    );

    const toolbar = screen.getByRole("toolbar", {
      name: "Herramientas de agenda",
    });

    expect(toolbar).toHaveAttribute("data-slot", "operational-toolbar");
    expect(toolbar).not.toHaveClass("card-enterprise");
    expect(toolbar.querySelector('[data-slot="operational-toolbar-context"]')).toBeTruthy();
    expect(toolbar.querySelector('[data-slot="operational-toolbar-controls"]')).toBeTruthy();
  });

  it("keeps desktop filters transparent and padding-free", () => {
    render(
      <FilterBar title="Filtros de actividades">
        <input aria-label="Buscar actividades" />
      </FilterBar>,
    );

    const filters = screen.getByLabelText("Filtros de actividades");
    expect(filters).not.toHaveClass("card-enterprise");
    expect(filters).toHaveClass("bg-transparent", "p-0");
  });

  it("exposes explicit desktop and mobile data representations", () => {
    render(
      <ResponsiveDataView
        desktop={<div>Tabla operativa</div>}
        mobile={<div>Tarjetas operativas</div>}
      />,
    );

    expect(screen.getByTestId("desktop-data-view")).toHaveClass("hidden", "md:block");
    expect(screen.getByTestId("mobile-data-view")).toHaveClass("md:hidden");
  });

  it("centralizes semantic badges, avatars and form layout", () => {
    render(
      <>
        <StatusBadge label="En progreso" tone="warning" />
        <PriorityBadge label="Crítica" tone="critical" />
        <UserAvatar name="Camila Rojas" />
        <FormSection description="Datos principales" title="Detalles">
          <p>Campos</p>
        </FormSection>
        <FormActions><button type="button">Cancelar</button></FormActions>
      </>,
    );

    expect(screen.getByText("En progreso")).toHaveClass("status-warning");
    expect(screen.getByText("Crítica")).toHaveClass("status-critical");
    expect(screen.getByText("CR")).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Detalles" })).toBeVisible();
  });

  it("uses designed empty, loading and error states", () => {
    render(
      <>
        <EmptyState description="Cambia los filtros." title="Sin resultados" />
        <LoadingState label="Cargando agenda" />
        <ErrorState description="Vuelve a intentarlo." title="No fue posible cargar" />
      </>,
    );

    expect(screen.getByRole("status", { name: "Cargando agenda" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("No fue posible cargar");
  });
});
