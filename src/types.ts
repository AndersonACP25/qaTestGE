export type NavigationPage =
  | "overview"
  | "bugs"
  | "cases"
  | "case-builder"
  | "runs"
  | "evidence"
  | "team"
  | "settings";

export type PriorityLevel = "Crítica" | "Alta" | "Media" | "Baja";
export type CaseStatus = "Aprobado" | "Fallido" | "Pendiente";

export interface Bug {
  id: string;
  title: string;
  project: string;
  priority: PriorityLevel;
  status: string;
  assignee: string;
  color: "violet" | "blue" | "amber" | "green" | "pink" | "orange";
  updated: string;
}

export interface TestCase {
  id: string;
  title: string;
  suite: string;
  status: CaseStatus;
  updated: string;
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
  | "users"
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
