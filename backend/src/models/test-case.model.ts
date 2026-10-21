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
  tagIds: string[];
}

export interface TestStep {
  action: string;
  expectedResult: string;
}
export type CreateTestCaseInput = Pick<TestCase, "title" | "projectId"> & {
  suite?: string;
  preconditions?: string;
  steps?: TestStep[];
  tagIds?: string[];
};
export type UpdateTestCaseInput = Omit<CreateTestCaseInput, "projectId">;

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

export interface CreateTestCaseAttachmentInput {
  projectId: string;
  testCaseId: string;
  name: string;
  kind: "image" | "link";
  url?: string;
  mediaType?: string;
  imageData?: Buffer;
}
