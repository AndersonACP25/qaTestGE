export const testCaseStatuses = ["Aprobado", "Fallido", "Pendiente"] as const;
export type TestCaseStatus = (typeof testCaseStatuses)[number];

export interface TestCase {
  id: string;
  title: string;
  suite: string;
  status: TestCaseStatus;
  createdAt: string;
}

export type CreateTestCaseInput = Pick<TestCase, "title" | "suite">;
