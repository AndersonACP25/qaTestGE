export type NavigationPage =
  | "overview"
  | "bugs"
  | "cases"
  | "case-builder"
  | "runs"
  | "evidence"
  | "settings";

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
  color: "violet" | "blue" | "amber" | "green" | "pink" | "orange";
  updated: string;
  createdAt?: string;
}

export interface TestCase {
  id: string;
  projectId?: string;
  title: string;
  suite: string;
  status: CaseStatus;
  updated: string;
  preconditions?: string;
  steps?: { action: string; expectedResult: string }[];
  createdAt?: string;
}

export interface TestRun {
  id: string;
  title: string;
  cases: string;
  progress: number;
  status: "En curso" | "Completado";
  owner: string;
}

export interface Evidence {
  id: string;
  name: string;
  type: "Imagen" | "Video" | "Archivo";
  related: string;
  size: string;
  date: string;
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
  | "close"
  | "file";
