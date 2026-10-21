import type { Repository, Project } from "../repositories/repository.js";
import type { BugStatus, CreateBugInput } from "../models/bug.model.js";
import type {
  TestCaseStatus,
  CreateTestCaseAttachmentInput,
  CreateTestCaseInput,
  UpdateTestCaseInput,
} from "../models/test-case.model.js";
import type { CreateTestRunInput } from "../models/test-run.model.js";
import type { CreateEvidenceInput } from "../models/evidence.model.js";
import { HttpError } from "../http-error.js";

export class AuthorizedRepository implements Repository {
  constructor(
    private readonly base: Repository,
    private readonly projects: () => Promise<Project[]>,
  ) {}
  health() {
    return this.base.health();
  }
  listProjects() {
    return this.projects();
  }
  private async projectIds(projectId?: string) {
    const ids = (await this.projects()).map((p) => p.id);
    if (projectId && !ids.includes(projectId))
      throw new HttpError(404, "PROJECT_NOT_FOUND", "Proyecto no disponible para esta cuenta.");
    return projectId ? [projectId] : ids;
  }
  private async list<T>(
    projectId: string | undefined,
    read: (id: string) => Promise<T[]>,
  ): Promise<T[]> {
    return (await Promise.all((await this.projectIds(projectId)).map(read))).flat();
  }
  listBugs(id?: string) {
    return this.list(id, (projectId) => this.base.listBugs(projectId));
  }
  listCases(id?: string) {
    return this.list(id, (projectId) => this.base.listCases(projectId));
  }
  listRuns(id?: string) {
    return this.list(id, (projectId) => this.base.listRuns(projectId));
  }
  listEvidence(id?: string) {
    return this.list(id, (projectId) => this.base.listEvidence(projectId));
  }
  async createBug(input: CreateBugInput) {
    await this.projectIds(input.projectId);
    return this.base.createBug(input);
  }
  async updateBugStatus(id: string, projectId: string, status: BugStatus) {
    await this.projectIds(projectId);
    return this.base.updateBugStatus(id, projectId, status);
  }
  async createCase(input: CreateTestCaseInput) {
    await this.projectIds(input.projectId);
    return this.base.createCase(input);
  }
  async updateCase(id: string, projectId: string, input: UpdateTestCaseInput) {
    await this.projectIds(projectId);
    return this.base.updateCase(id, projectId, input);
  }
  async deleteCase(id: string, projectId: string) {
    await this.projectIds(projectId);
    return this.base.deleteCase(id, projectId);
  }
  async updateCaseStatus(id: string, projectId: string, status: TestCaseStatus) {
    await this.projectIds(projectId);
    return this.base.updateCaseStatus(id, projectId, status);
  }
  async listCaseAttachments(id: string, projectId: string) {
    await this.projectIds(projectId);
    return this.base.listCaseAttachments(id, projectId);
  }
  async getCaseAttachment(id: string, attachmentId: string, projectId: string) {
    await this.projectIds(projectId);
    return this.base.getCaseAttachment(id, attachmentId, projectId);
  }
  async createCaseAttachment(input: CreateTestCaseAttachmentInput) {
    await this.projectIds(input.projectId);
    return this.base.createCaseAttachment(input);
  }
  async deleteCaseAttachment(id: string, attachmentId: string, projectId: string) {
    await this.projectIds(projectId);
    return this.base.deleteCaseAttachment(id, attachmentId, projectId);
  }
  async createRun(input: CreateTestRunInput) {
    await this.projectIds(input.projectId);
    return this.base.createRun(input);
  }
  async createEvidence(input: CreateEvidenceInput) {
    await this.projectIds(input.projectId);
    return this.base.createEvidence(input);
  }
}
