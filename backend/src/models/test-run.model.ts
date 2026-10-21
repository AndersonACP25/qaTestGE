export const testRunStatuses = ["En curso", "Completado"] as const;
export type TestRunStatus = (typeof testRunStatuses)[number];

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
}

export type CreateTestRunInput = Pick<TestRun, "title" | "owner" | "projectId"> & {
  caseIds?: string[];
  tagIds?: string[];
};
