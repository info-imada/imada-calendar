import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addActivityComment: vi.fn(),
  cancelActivity: vi.fn(),
  changeActivityStatus: vi.fn(),
  onEdit: vi.fn(),
  onOpenChange: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/app/actions/activities", () => ({
  addActivityComment: mocks.addActivityComment,
  cancelActivity: mocks.cancelActivity,
  changeActivityStatus: mocks.changeActivityStatus,
}));
vi.mock("@/components/product/forms", () => ({
  ResponsiveSheet: ({ children, title }: { children: ReactNode; title: string }) => (
    <section aria-label={title}>{children}</section>
  ),
}));

import { ActivityDetailPanel } from "@/features/activities/activity-detail-panel";

const activity = {
  id: "cmrl0x4sa000180o3h9q67awx",
  title: "Mantenimiento preventivo",
  description: "Revisión general",
  startsAt: "2026-08-24T12:00:00.000Z",
  endsAt: "2026-08-24T13:00:00.000Z",
  allDay: false,
  country: { id: "cmrl0x4sa000280o3h9q67awx", code: "PA", name: "Panamá" },
  team: null,
  customer: null,
  type: { id: "cmrl0x4sa000380o3h9q67awx", code: "MAINTENANCE", name: "Mantenimiento", color: "#fff" },
  status: { id: "cmrl0x4sa000480o3h9q67awx", code: "PLANNED", name: "Planificada", color: "#fff" },
  priority: { id: "cmrl0x4sa000580o3h9q67awx", code: "MEDIUM", name: "Media", color: "#fff", level: 2 },
  assignedTo: null,
  createdBy: { id: "cmrl0x4sa000680o3h9q67awx", email: "admin@example.com", name: "Admin" },
  series: null,
  comments: [],
  audit: [],
  createdAt: "2026-08-23T12:00:00.000Z",
  updatedAt: "2026-08-23T12:00:00.000Z",
  capabilities: { canComment: false, canReadAudit: false, canUpdate: true },
} as const;

const model = {
  currentUserId: "cmrl0x4sa000680o3h9q67awx",
  canCreate: true,
  activities: [],
  countries: [],
  technicians: [],
  types: [],
  statuses: [activity.status],
  priorities: [activity.priority],
};

describe("ActivityDetailPanel", () => {
  it("keeps editing as a visible primary action", () => {
    render(
      <ActivityDetailPanel
        activity={activity}
        model={model}
        onEdit={mocks.onEdit}
        onOpenChange={mocks.onOpenChange}
        open
      />,
    );

    const editButton = screen.getByRole("button", { name: "Editar actividad" });
    expect(editButton).toBeVisible();
    fireEvent.click(editButton);

    expect(mocks.onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.onEdit).toHaveBeenCalledWith(activity);
  });
});
