export const testRunStatuses = ["En curso", "Completado"] as const;
export type TestRunStatus = (typeof testRunStatuses)[number];
export const resultStatuses = ["passed", "failed", "blocked", "skipped"] as const;
export type ResultStatus = (typeof resultStatuses)[number];
export interface TestRunResult {
  id: string;
  caseId: string;
  title: string;
  status: ResultStatus;
  notes: string;
  executedAt: string | null;
  steps: { action: string; expectedResult: string }[];
}
export interface UpdateTestRunInput {
  title: string;
  owner: string;
  caseIds: string[];
  status: TestRunStatus;
  tagIds?: string[];
}
export interface UpdateRunResultInput {
  status: ResultStatus;
  notes: string;
}

export interface TestRun {
  id: string;
  projectId: string;
  caseIds: string[];
  title: string;
  caseCount: number;
  progress: number;
  status: TestRunStatus;
  owner: string;
  createdAt: string;
  tagIds: string[];
  results: TestRunResult[];
}

export type CreateTestRunInput = Pick<TestRun, "title" | "owner" | "projectId"> & {
  caseIds?: string[];
  tagIds?: string[];
};
