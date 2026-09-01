export type WorkLogStatus = "IN_PROGRESS" | "COMPLETION_PENDING" | "COMPLETED";

export type WorkLogScope = {
  scopeType: "GLOBAL" | "COUNTRY" | "TEAM";
  country: { id: string; code: string; name: string };
  team: { id: string; name: string } | null;
  canStart: boolean;
};

export type WorkLogCustomer = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  locations: { id: string; name: string; isActive: boolean }[];
};

export type WorkLogActivityOption = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  country: { id: string; code: string; name: string };
  team: { id: string; name: string } | null;
  customer: { id: string; name: string; code: string | null; isActive: boolean } | null;
  assignedTo: { id: string; name: string | null; email: string | null } | null;
};

export type WorkLogAttachmentPresentation = {
  id: string;
  uploadUuid: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  referenceUrl: string | null;
};

export type WorkLogPresentation = {
  id: string;
  userId: string;
  technician: { id: string; name: string | null; email: string | null };
  activityId: string | null;
  activity: { id: string; title: string } | null;
  country: { id: string; code: string; name: string };
  team: { id: string; name: string } | null;
  customer: { id: string; name: string; code: string | null; isActive: boolean } | null;
  customerLocation: { id: string; name: string; isActive: boolean } | null;
  workDate: string;
  timezone: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  status: WorkLogStatus;
  startResetUsedAt: string | null;
  completedAt: string | null;
  draftNotifiedAt: string | null;
  machineReference: string | null;
  location: string | null;
  description: string | null;
  attachments: WorkLogAttachmentPresentation[];
  createdAt: string;
  updatedAt: string;
  capabilities: {
    canUpdate: boolean;
    canFinish: boolean;
    canComplete: boolean;
    canAdminUpdate: boolean;
    canDelete: boolean;
  };
};

export type WorkLogFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  customerId?: string;
  reference?: string;
  status?: WorkLogStatus;
};

export type WorkLogHistoryModel = {
  items: WorkLogPresentation[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};

export type WorkLogWorkspaceModel = {
  currentUser: {
    id: string;
    name: string | null;
    email: string | null;
    timezone: string;
  };
  activeWorkLog: WorkLogPresentation | null;
  scopes: WorkLogScope[];
  customers: WorkLogCustomer[];
  activities: WorkLogActivityOption[];
  capabilities: {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canFinish: boolean;
    canComplete: boolean;
    canAdminUpdate: boolean;
    canDelete: boolean;
  };
};
