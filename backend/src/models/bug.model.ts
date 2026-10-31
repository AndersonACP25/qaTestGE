export const bugPriorities = ["Crítica", "Alta", "Media", "Baja"] as const;
export const bugStatuses = ["Abierto", "En progreso", "En revisión", "Resuelto"] as const;

export type BugPriority = (typeof bugPriorities)[number];
export type BugStatus = string;

export interface Bug {
  id: string;
  title: string;
  description: string;
  project: string;
  projectId: string;
  priority: BugPriority;
  status: BugStatus;
  assignee: string | null;
  assigneeUserId?: string | null;
  createdAt: string;
  tagIds: string[];
  severity?: BugPriority;
  environment?: string;
  affectedVersion?: string;
  sourceResultId?: string | null;
  sourceRunId?: string | null;
  sourceCaseId?: string | null;
  sourceSteps?: { action: string; expectedResult: string }[];
}

export type CreateBugInput = Pick<Bug, "title" | "projectId" | "priority"> & {
  severity?: BugPriority;
  environment?: string;
  affectedVersion?: string;
  sourceResultId?: string;
  description?: string;
  assignee?: string | null;
  assigneeUserId?: string | null;
  tagIds?: string[];
};

export type UpdateBugInput = Omit<CreateBugInput, "projectId"> & {
  status?: BugStatus;
};
