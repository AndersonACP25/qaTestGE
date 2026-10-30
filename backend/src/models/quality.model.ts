export interface TestPlan {
  id: string;
  projectId: string;
  name: string;
  description: string;
  caseIds: string[];
  revision: number;
}
export interface PlanInput {
  name: string;
  description: string;
  caseIds: string[];
  revision?: number;
}
export interface BugWorkflow {
  states: string[];
  closedStates?: string[];
  transitions: Record<string, string[]>;
  revision: number;
}
export interface CaseVersion {
  version: number;
  changedAt: string;
  snapshot: unknown;
}
export interface QualityRepository {
  listPlans(projectId: string): Promise<TestPlan[]>;
  savePlan(
    projectId: string,
    id: string | null,
    input: PlanInput,
    context?: import("../repositories/creation-request.js").CreationContext,
  ): Promise<TestPlan>;
  deletePlan(projectId: string, id: string): Promise<void>;
  caseHistory(projectId: string, id: string): Promise<CaseVersion[]>;
  workflow(projectId: string): Promise<BugWorkflow>;
  saveWorkflow(projectId: string, input: BugWorkflow): Promise<BugWorkflow>;
}
