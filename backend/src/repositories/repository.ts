import type { Bug, BugStatus, CreateBugInput, UpdateBugInput } from "../models/bug.model.js";
import type {
  TestCase,
  TestCaseAttachment,
  TestCaseStatus,
  CreateTestCaseAttachmentInput,
  CreateTestCaseInput,
  UpdateTestCaseInput,
} from "../models/test-case.model.js";
import type {
  TestRun,
  CreateTestRunInput,
  UpdateTestRunInput,
  UpdateRunResultInput,
} from "../models/test-run.model.js";
import type {
  Evidence,
  EvidenceFile,
  CreateEvidenceInput,
  UpdateEvidenceInput,
} from "../models/evidence.model.js";
import type { Request } from "express";
import type { CreateTagInput, Tag, UpdateTagInput } from "../models/tag.model.js";

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string;
}
export interface Repository {
  health(): Promise<void>;
  listProjects(): Promise<Project[]>;
  listBugs(projectId?: string): Promise<Bug[]>;
  createBug(input: CreateBugInput): Promise<Bug>;
  updateBug(id: string, projectId: string, input: UpdateBugInput): Promise<Bug | null>;
  deleteBug(id: string, projectId: string): Promise<boolean>;
  updateBugStatus(id: string, projectId: string, status: BugStatus): Promise<Bug | null>;
  listCases(projectId?: string): Promise<TestCase[]>;
  createCase(input: CreateTestCaseInput): Promise<TestCase>;
  updateCase(id: string, projectId: string, input: UpdateTestCaseInput): Promise<TestCase | null>;
  deleteCase(id: string, projectId: string): Promise<boolean>;
  updateCaseStatus(id: string, projectId: string, status: TestCaseStatus): Promise<TestCase | null>;
  listCaseAttachments(id: string, projectId: string): Promise<TestCaseAttachment[]>;
  getCaseAttachment(
    id: string,
    attachmentId: string,
    projectId: string,
  ): Promise<(TestCaseAttachment & { imageData: Buffer | null }) | null>;
  createCaseAttachment(input: CreateTestCaseAttachmentInput): Promise<TestCaseAttachment | null>;
  deleteCaseAttachment(id: string, attachmentId: string, projectId: string): Promise<boolean>;
  listRuns(projectId?: string): Promise<TestRun[]>;
  createRun(input: CreateTestRunInput): Promise<TestRun>;
  updateRun(id: string, projectId: string, input: UpdateTestRunInput): Promise<TestRun | null>;
  deleteRun(id: string, projectId: string): Promise<boolean>;
  updateRunResult(
    id: string,
    resultId: string,
    projectId: string,
    input: UpdateRunResultInput,
  ): Promise<TestRun | null>;
  listEvidence(projectId?: string): Promise<Evidence[]>;
  createEvidence(input: CreateEvidenceInput): Promise<Evidence>;
  updateEvidence(
    id: string,
    projectId: string,
    input: UpdateEvidenceInput,
  ): Promise<Evidence | null>;
  deleteEvidence(id: string, projectId: string): Promise<boolean>;
  saveEvidenceFile(
    id: string | null,
    projectId: string,
    file: EvidenceFile,
    related?: string | null,
  ): Promise<Evidence | null>;
  getEvidenceFile(
    id: string,
    projectId: string,
  ): Promise<(EvidenceFile & { sizeBytes: number }) | null>;
  listTags(projectId: string): Promise<Tag[]>;
  createTag(input: CreateTagInput): Promise<Tag>;
  updateTag(id: string, projectId: string, input: UpdateTagInput): Promise<Tag | null>;
  deleteTag(id: string, projectId: string): Promise<boolean>;
}
export function repository(request: Request): Repository {
  return request.res!.locals.repository as Repository;
}
