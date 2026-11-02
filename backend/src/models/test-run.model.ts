export const testRunStatuses = ["En curso", "Completado"] as const;
export type TestRunStatus = (typeof testRunStatuses)[number];
export const resultStatuses = ["passed", "failed", "blocked", "skipped"] as const;
export type ResultStatus = (typeof resultStatuses)[number];
export interface TestRunResult {
  id: string;
  caseId: string;
  caseVersion?: number;
  title: string;
  status: ResultStatus;
  notes: string;
  executedAt: string | null;
  steps: { action: string; expectedResult: string }[];
}
export interface UpdateTestRunInput {
  title: string;
  owner: string;
  ownerUserId?: string | null;
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
  planId?: string | null;
  sourceRunId?: string | null;
  title: string;
  caseCount: number;
  progress: number;
  status: TestRunStatus;
  owner: string;
  ownerUserId?: string | null;
  createdAt: string;
  tagIds: string[];
  results: TestRunResult[];
}

export type CreateTestRunInput = Pick<TestRun, "title" | "owner" | "projectId"> & {
  ownerUserId?: string | null;
  caseIds?: string[];
  planId?: string;
  sourceRunId?: string;
  failedOnly?: boolean;
  tagIds?: string[];
};
