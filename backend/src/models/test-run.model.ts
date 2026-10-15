export const testRunStatuses = ["En curso", "Completado"] as const;
export type TestRunStatus = (typeof testRunStatuses)[number];

export interface TestRun {
  id: string;
  title: string;
  caseCount: number;
  progress: number;
  status: TestRunStatus;
  owner: string;
  createdAt: string;
}

export type CreateTestRunInput = Pick<TestRun, "title" | "owner"> & {
  caseCount?: number;
};
