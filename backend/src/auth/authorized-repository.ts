import type { CreationContext } from "../repositories/creation-request.js";
import type { ListQuery } from "../repositories/list-query.js";
import type { Repository, Project } from "../repositories/repository.js";
import type { BugStatus, CreateBugInput, UpdateBugInput } from "../models/bug.model.js";
import type {
  TestCaseStatus,
  CreateTestCaseAttachmentInput,
  CreateTestCaseInput,
  UpdateTestCaseInput,
} from "../models/test-case.model.js";
import type {
  CreateTestRunInput,
  UpdateTestRunInput,
  UpdateRunResultInput,
} from "../models/test-run.model.js";
import type {
  CreateEvidenceInput,
  EvidenceFile,
  UpdateEvidenceInput,
} from "../models/evidence.model.js";
import { HttpError } from "../http-error.js";
import type { CreateTagInput, UpdateTagInput } from "../models/tag.model.js";

export class AuthorizedRepository implements Repository {
  constructor(
    private readonly base: Repository,
    private readonly projects: () => Promise<Project[]>,
    private readonly actorId?: string,
  ) {}
  get collaboration():
    import("../models/collaboration.model.js").CollaborationRepository | undefined {
    const base = this.base.collaboration;
    if (!base) return undefined;
    return {
      assignedWork: async (p, filters) => {
        await this.projectIds(p);
        return base.assignedWork(p, filters);
      },
      auditSettings: async (p) => {
        await this.projectIds(p);
        return base.auditSettings(p);
      },
      saveAuditSettings: async (p, input) => {
        await this.projectIds(p);
        return base.saveAuditSettings(p, input);
      },
      createProjectUser: async (p, input, key) => {
        await this.projectIds(p);
        return base.createProjectUser(p, input, key);
      },
      readAllNotifications: async (p) => {
        await this.projectIds(p);
        return base.readAllNotifications(p);
      },
      members: async (p, c) => {
        await this.projectIds(p);
        return base.members(p, c);
      },
      saveMember: async (p, u, r, v) => {
        await this.projectIds(p);
        return base.saveMember(p, u, r, v);
      },
      comments: async (p, t) => {
        await this.projectIds(p);
        return base.comments(p, t);
      },
      createComment: async (p, t, b, k) => {
        await this.projectIds(p);
        return base.createComment(p, t, b, k);
      },
      editComment: async (p, id, b, v, r) => {
        await this.projectIds(p);
        return base.editComment(p, id, b, v, r);
      },
      activity: async (p, t, b, filters) => {
        await this.projectIds(p);
        return base.activity(p, t, b, filters);
      },
      notifications: async (p) => {
        await this.projectIds(p);
        return base.notifications(p);
      },
      readNotification: async (p, id) => {
        await this.projectIds(p);
        return base.readNotification(p, id);
      },
    };
  }
  get analytics(): import("../models/analytics.model.js").AnalyticsRepository | undefined {
    const base = this.base.analytics;
    if (!base) return undefined;
    return {
      overview: async (p, range) => {
        await this.projectIds(p);
        return base.overview(p, range);
      },
      requirements: async (p, limit, offset, search) => {
        await this.projectIds(p);
        return base.requirements(p, limit, offset, search);
      },
      saveRequirement: async (p, id, input, context) => {
        await this.projectIds(p);
        return base.saveRequirement(
          p,
          id,
          input,
          context ? { ...context, actorId: this.actorId! } : undefined,
        );
      },
      deleteRequirement: async (p, id, version) => {
        await this.projectIds(p);
        return base.deleteRequirement(p, id, version);
      },
      linkCaseBug: async (p, requirementId, caseId, bugId) => {
        await this.projectIds(p);
        return base.linkCaseBug(p, requirementId, caseId, bugId);
      },
      coverage: async (p, limit, offset, requirementId) => {
        await this.projectIds(p);
        return base.coverage(p, limit, offset, requirementId);
      },
      runReport: async (p, id) => {
        await this.projectIds(p);
        return base.runReport(p, id);
      },
      importTags: async (p, rows, context) => {
        await this.projectIds(p);
        return base.importTags(p, rows, { ...context, actorId: this.actorId! });
      },
    };
  }
  get quality(): import("../models/quality.model.js").QualityRepository | undefined {
    const base = this.base.quality;
    if (!base) return undefined;
    return {
      listPlans: async (p) => {
        await this.projectIds(p);
        return base.listPlans(p);
      },
      savePlan: async (p, id, input, context) => {
        await this.projectIds(p);
        return base.savePlan(
          p,
          id,
          input,
          context ? { ...context, actorId: this.actorId! } : undefined,
        );
      },
      deletePlan: async (p, id) => {
        await this.projectIds(p);
        return base.deletePlan(p, id);
      },
      caseHistory: async (p, id) => {
        await this.projectIds(p);
        return base.caseHistory(p, id);
      },
      workflow: async (p) => {
        await this.projectIds(p);
        return base.workflow(p);
      },
      saveWorkflow: async (p, input) => {
        await this.projectIds(p);
        return base.saveWorkflow(p, input);
      },
    };
  }
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
  listBugs(id?: string, options?: ListQuery) {
    return this.list(id, (projectId) =>
      options ? this.base.listBugs(projectId, options) : this.base.listBugs(projectId),
    );
  }
  listCases(id?: string, options?: ListQuery) {
    return this.list(id, (projectId) =>
      options ? this.base.listCases(projectId, options) : this.base.listCases(projectId),
    );
  }
  listRuns(id?: string, options?: ListQuery) {
    return this.list(id, (projectId) =>
      options ? this.base.listRuns(projectId, options) : this.base.listRuns(projectId),
    );
  }
  listEvidence(id?: string) {
    return this.list(id, (projectId) => this.base.listEvidence(projectId));
  }
  async createBug(input: CreateBugInput, context?: CreationContext) {
    await this.projectIds(input.projectId);
    if (context && !this.actorId) throw new HttpError(401, "UNAUTHENTICATED", "Inicia sesión.");
    return context
      ? this.base.createBug(input, { ...context, actorId: this.actorId! })
      : this.base.createBug(input);
  }
  async updateBugStatus(id: string, projectId: string, status: BugStatus) {
    await this.projectIds(projectId);
    return this.base.updateBugStatus(id, projectId, status);
  }
  async updateBug(id: string, projectId: string, input: UpdateBugInput) {
    await this.projectIds(projectId);
    return this.base.updateBug(id, projectId, input);
  }
  async deleteBug(id: string, projectId: string) {
    await this.projectIds(projectId);
    return this.base.deleteBug(id, projectId);
  }
  async createCase(input: CreateTestCaseInput, context?: CreationContext) {
    await this.projectIds(input.projectId);
    if (context && !this.actorId) throw new HttpError(401, "UNAUTHENTICATED", "Inicia sesión.");
    return context
      ? this.base.createCase(input, { ...context, actorId: this.actorId! })
      : this.base.createCase(input);
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
  async createRun(input: CreateTestRunInput, context?: CreationContext) {
    await this.projectIds(input.projectId);
    if (context && !this.actorId) throw new HttpError(401, "UNAUTHENTICATED", "Inicia sesión.");
    const assigned = {
      ...input,
      ownerUserId: input.ownerUserId === undefined ? this.actorId : input.ownerUserId,
    };
    return context
      ? this.base.createRun(assigned, { ...context, actorId: this.actorId! })
      : this.base.createRun(assigned);
  }
  async updateRun(id: string, projectId: string, input: UpdateTestRunInput) {
    await this.projectIds(projectId);
    return this.base.updateRun(id, projectId, input);
  }
  async deleteRun(id: string, projectId: string) {
    await this.projectIds(projectId);
    return this.base.deleteRun(id, projectId);
  }
  async updateRunResult(
    id: string,
    resultId: string,
    projectId: string,
    input: UpdateRunResultInput,
  ) {
    await this.projectIds(projectId);
    return this.base.updateRunResult(id, resultId, projectId, input);
  }
  async createEvidence(input: CreateEvidenceInput) {
    await this.projectIds(input.projectId);
    return this.base.createEvidence(input);
  }
  async updateEvidence(id: string, projectId: string, input: UpdateEvidenceInput) {
    await this.projectIds(projectId);
    return this.base.updateEvidence(id, projectId, input);
  }
  async deleteEvidence(id: string, projectId: string) {
    await this.projectIds(projectId);
    return this.base.deleteEvidence(id, projectId);
  }
  async saveEvidenceFile(
    id: string | null,
    projectId: string,
    file: EvidenceFile,
    related?: string | null,
  ) {
    await this.projectIds(projectId);
    return this.base.saveEvidenceFile(id, projectId, file, related);
  }
  async getEvidenceFile(id: string, projectId: string) {
    await this.projectIds(projectId);
    return this.base.getEvidenceFile(id, projectId);
  }
  async listTags(projectId: string) {
    await this.projectIds(projectId);
    return this.base.listTags(projectId);
  }
  async createTag(input: CreateTagInput) {
    await this.projectIds(input.projectId);
    return this.base.createTag(input);
  }
  async updateTag(id: string, projectId: string, input: UpdateTagInput) {
    await this.projectIds(projectId);
    return this.base.updateTag(id, projectId, input);
  }
  async deleteTag(id: string, projectId: string) {
    await this.projectIds(projectId);
    return this.base.deleteTag(id, projectId);
  }
}
