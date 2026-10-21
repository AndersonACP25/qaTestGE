export const testCaseStatuses = ["Aprobado", "Fallido", "Pendiente"] as const;
export type TestCaseStatus = (typeof testCaseStatuses)[number];

export interface TestCase {
  id: string;
  projectId: string;
  title: string;
  suite: string;
  status: TestCaseStatus;
  createdAt: string;
  preconditions: string;
  steps: TestStep[];
}

export interface TestStep { action: string; expectedResult: string }
export type CreateTestCaseInput = Pick<TestCase, "title" | "suite" | "projectId"> & { preconditions?: string; steps?: TestStep[] };
