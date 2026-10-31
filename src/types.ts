export type NavigationPage =
  | "coverage"
  | "overview"
  | "access"
  | "mentions"
  | "reports"
  | "plans"
  | "bugs"
  | "cases"
  | "bug-builder"
  | "case-builder"
  | "runs"
  | "evidence"
  | "tags"
  | "settings"
  | "wiki";

export type PriorityLevel = "Crítica" | "Alta" | "Media" | "Baja";
export type BugStatus = string;
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
  severity?: PriorityLevel;
  environment?: string;
  affectedVersion?: string;
  sourceResultId?: string | null;
  sourceRunId?: string | null;
  sourceCaseId?: string | null;
  sourceSteps?: { action: string; expectedResult: string }[];
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
  testType?: string;
  lifecycle?: "Borrador" | "Listo" | "Obsoleto";
  version?: number;
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
  planId?: string | null;
  sourceRunId?: string | null;
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
  | "chart"
  | "file";
