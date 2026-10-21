import type { Bug, BugStatus, CreateBugInput } from "../models/bug.model.js";
import type { TestCase, TestCaseStatus, CreateTestCaseInput } from "../models/test-case.model.js";
import type { TestRun, CreateTestRunInput } from "../models/test-run.model.js";
import type { Evidence, CreateEvidenceInput } from "../models/evidence.model.js";
import type { Request } from "express";

export interface Project { id: string; organizationId: string; name: string; description: string }
export interface Repository {
  health(): Promise<void>;
  listProjects(): Promise<Project[]>;
  listBugs(projectId?: string): Promise<Bug[]>;
  createBug(input: CreateBugInput): Promise<Bug>;
  updateBugStatus(id: string, projectId: string, status: BugStatus): Promise<Bug | null>;
  listCases(projectId?: string): Promise<TestCase[]>;
  createCase(input: CreateTestCaseInput): Promise<TestCase>;
  updateCaseStatus(id: string, projectId: string, status: TestCaseStatus): Promise<TestCase | null>;
  listRuns(projectId?: string): Promise<TestRun[]>;
  createRun(input: CreateTestRunInput): Promise<TestRun>;
  listEvidence(projectId?: string): Promise<Evidence[]>;
  createEvidence(input: CreateEvidenceInput): Promise<Evidence>;
}
export function repository(request: Request): Repository { return request.res!.locals.repository as Repository; }
