export type ActivityCatalogItem = {
  id: string;
  code: string;
  name: string;
  color: string;
};

export type ActivityCountry = {
  id: string;
  code: string;
  name: string;
  teams: { id: string; name: string }[];
};

export type ActivityCustomer = {
  id: string;
  name: string;
  code?: string | null;
  isActive?: boolean;
};

export type ActivityTechnician = {
  id: string;
  email: string | null;
  name: string | null;
};

export type ActivityCommentPresentation = {
  id: string;
  body: string;
  createdAt: string;
  author: ActivityTechnician;
};

export type ActivityAuditPresentation = {
  id: string;
  action: string;
  createdAt: string;
  actorId: string | null;
};

export type ActivityPresentation = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  country: Omit<ActivityCountry, "teams">;
  team: { id: string; name: string } | null;
  customer?: ActivityCustomer | null;
  type: ActivityCatalogItem;
  status: ActivityCatalogItem;
  priority: ActivityCatalogItem & { level: number };
  assignedTo: ActivityTechnician | null;
  partNumber?: string | null;
  partUrl?: string | null;
  createdBy: ActivityTechnician;
  series: {
    id: string;
    recurrenceRule: {
      frequency: "DAILY" | "WEEKLY" | "MONTHLY";
      interval: number;
      endsAt: string | null;
      timezone: string;
    } | null;
  } | null;
  workLog?: { id: string; status: "IN_PROGRESS" | "COMPLETION_PENDING" | "COMPLETED" } | null;
  comments: readonly ActivityCommentPresentation[];
  audit: readonly ActivityAuditPresentation[];
  createdAt: string;
  updatedAt: string;
  capabilities: {
    canComment: boolean;
    canReadAudit?: boolean;
    canUpdate: boolean;
    canCreateWorkLog?: boolean;
    canOpenWorkLog?: boolean;
  };
};

export type ActivityWorkspaceModel = {
  currentUserId: string;
  canCreate: boolean;
  activities: ActivityPresentation[];
  countries: ActivityCountry[];
  customers?: ActivityCustomer[];
  technicians: ActivityTechnician[];
  types: ActivityCatalogItem[];
  statuses: ActivityCatalogItem[];
  priorities: (ActivityCatalogItem & { level: number })[];
};
