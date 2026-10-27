export type NavigationPage =
  | "overview"
  | "bugs"
  | "cases"
  | "case-builder"
  | "runs"
  | "evidence"
  | "tags"
  | "settings"
  | "projects"
  | "teams"
  | "wiki";

export type PriorityLevel = "Crítica" | "Alta" | "Media" | "Baja";
export type BugStatus = "Abierto" | "En progreso" | "En revisión" | "Resuelto";
export type CaseStatus = "Aprobado" | "Fallido" | "Pendiente";

export const bugStatuses: BugStatus[] = ["Abierto", "En progreso", "En revisión", "Resuelto"];
export const caseStatuses: CaseStatus[] = ["Pendiente", "Aprobado", "Fallido"];

export interface Bug {
  id: string;
  projectId?: string;
  title: string;
  project: string;
  description?: string;
  priority: PriorityLevel;
  status: BugStatus;
  assignee: string;
  assigneeUserId?: string | null;
  color: "violet" | "blue" | "amber" | "green" | "pink" | "orange";
  updated: string;
  createdAt?: string;
  tagIds?: string[];
}

export interface TestCase {
  id: string;
  projectId?: string;
  title: string;
  suite: string;
  status: CaseStatus;
  updated: string;
  preconditions?: string;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  steps?: { action: string; expectedResult: string }[];
  createdAt?: string;
  tagIds?: string[];
}

export interface TestCaseAttachment {
  id: string;
  projectId: string;
  testCaseId: string;
  kind: "image" | "link";
  name: string;
  url: string | null;
  mediaType: string | null;
  createdAt: string;
}

export interface TestRun {
  id: string;
  title: string;
  cases: string;
  progress: number;
  status: "En curso" | "Completado";
  owner: string;
  projectId?: string;
  tagIds?: string[];
  caseIds?: string[];
  results?: import("../backend/src/models/test-run.model").TestRunResult[];
}

export interface Tag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Evidence {
  id: string;
  projectId: string;
  name: string;
  type: "Imagen" | "Video" | "Archivo";
  related: string;
  size: string;
  sizeBytes: number;
  hasFile: boolean;
  date: string;
  createdAt: string;
}

export type IconName =
  | "grid"
  | "bug"
  | "check-square"
  | "play"
  | "image"
  | "settings"
  | "search"
  | "plus"
  | "bell"
  | "chevron"
  | "arrow"
  | "dots"
  | "calendar"
  | "download"
  | "filter"
  | "clock"
  | "sparkle"
  | "tag"
  | "close"
  | "file";
