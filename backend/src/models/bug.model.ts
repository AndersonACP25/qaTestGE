export const bugPriorities = ["Crítica", "Alta", "Media", "Baja"] as const;
export const bugStatuses = ["Abierto", "En progreso", "En revisión", "Resuelto"] as const;

export type BugPriority = (typeof bugPriorities)[number];
export type BugStatus = (typeof bugStatuses)[number];

export interface Bug {
  id: string;
  title: string;
  description: string;
  project: string;
  priority: BugPriority;
  status: BugStatus;
  assignee: string | null;
  createdAt: string;
}

export type CreateBugInput = Pick<Bug, "title" | "project" | "priority"> & {
  description?: string;
  assignee?: string | null;
};
