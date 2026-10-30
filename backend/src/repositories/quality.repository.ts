import { previousCreation, rememberCreation } from "./creation-request.js";
import type { CreationContext } from "./creation-request.js";
import type { Pool, PoolClient } from "pg";
import type {
  BugWorkflow,
  CaseVersion,
  PlanInput,
  QualityRepository,
  TestPlan,
} from "../models/quality.model.js";
import { HttpError } from "../http-error.js";
import { parseReference, resourceId } from "../validation.js";

export class PostgresQualityRepository implements QualityRepository {
  constructor(private readonly pool: Pool) {}
  private async transaction<T>(work: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const value = await work(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async listPlans(projectId: string): Promise<TestPlan[]> {
    const result = await this.pool.query<TestPlan>(
      `SELECT 'PLAN-' || lpad(p.id::text,greatest(3,length(p.id::text)),'0') AS id,p.project_id::text AS "projectId",name,description,revision,
  COALESCE((SELECT array_agg('TC-' || lpad(test_case_id::text,greatest(3,length(test_case_id::text)),'0') ORDER BY test_case_id) FROM qa.test_plan_cases WHERE plan_id=p.id),ARRAY[]::text[]) AS "caseIds" FROM qa.test_plans p WHERE project_id=$1 ORDER BY p.id`,
      [projectId],
    );
    return result.rows;
  }
  async savePlan(
    projectId: string,
    id: string | null,
    input: PlanInput,
    context?: CreationContext,
  ): Promise<TestPlan> {
    return this.transaction(async (client) => {
      const previous = id
        ? null
        : await previousCreation(client, "plan", projectId, input, context);
      if (previous) {
        const result = await client.query<{
          id: string;
          name: string;
          description: string;
          revision: number;
          case_ids: string[];
        }>(
          "SELECT id::text,name,description,revision,COALESCE((SELECT array_agg(test_case_id::text ORDER BY test_case_id) FROM qa.test_plan_cases WHERE plan_id=p.id),ARRAY[]::text[]) AS case_ids FROM qa.test_plans p WHERE id=$1 AND project_id=$2",
          [previous, projectId],
        );
        if (!result.rows[0])
          throw new HttpError(
            409,
            "CREATED_RESOURCE_REMOVED",
            "El plan ya se eliminó. No se volverá a crear automáticamente.",
          );
        const r = result.rows[0];
        return {
          id: resourceId("PLAN", r.id),
          projectId,
          name: r.name,
          description: r.description,
          revision: r.revision,
          caseIds: r.case_ids.map((c) => resourceId("TC", c)),
        };
      }
      const row = id
        ? await client.query<{ id: string; revision: number }>(
            "UPDATE qa.test_plans SET name=$3,description=$4,revision=revision+1 WHERE id=$1 AND project_id=$2 AND revision=$5 RETURNING id::text,revision",
            [id, projectId, input.name.trim(), input.description, input.revision],
          )
        : await client.query<{ id: string; revision: number }>(
            "INSERT INTO qa.test_plans(project_id,name,description) VALUES($1,$2,$3) RETURNING id::text,revision",
            [projectId, input.name.trim(), input.description],
          );
      if (!row.rows[0])
        throw new HttpError(
          409,
          "PLAN_CONFLICT",
          "El plan cambió o ya no está disponible. Actualiza la lista.",
        );
      const plan = row.rows[0];
      await client.query("DELETE FROM qa.test_plan_cases WHERE plan_id=$1 AND project_id=$2", [
        plan.id,
        projectId,
      ]);
      for (const caseId of input.caseIds)
        await client.query(
          "INSERT INTO qa.test_plan_cases(project_id,plan_id,test_case_id) VALUES($1,$2,$3)",
          [projectId, plan.id, parseReference(caseId, "TC")],
        );
      if (!id) await rememberCreation(client, "plan", projectId, plan.id, input, context);
      return {
        id: resourceId("PLAN", plan.id),
        projectId,
        name: input.name.trim(),
        description: input.description,
        caseIds: input.caseIds,
        revision: plan.revision,
      };
    });
  }
  async deletePlan(projectId: string, id: string) {
    try {
      const result = await this.pool.query(
        "DELETE FROM qa.test_plans WHERE id=$1 AND project_id=$2",
        [id, projectId],
      );
      if (!result.rowCount) throw new HttpError(404, "PLAN_NOT_FOUND", "Plan no encontrado.");
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23503")
        throw new HttpError(
          409,
          "PLAN_IN_USE",
          "El plan tiene ejecuciones; consérvalo para mantener la trazabilidad.",
        );
      throw error;
    }
  }
  async caseHistory(projectId: string, id: string): Promise<CaseVersion[]> {
    const exists = await this.pool.query(
      "SELECT 1 FROM qa.test_cases WHERE id=$1 AND project_id=$2",
      [id, projectId],
    );
    if (!exists.rowCount) throw new HttpError(404, "CASE_NOT_FOUND", "Caso no encontrado.");
    const result = await this.pool.query<{ version: number; changed_at: Date; snapshot: unknown }>(
      "SELECT version,changed_at,snapshot FROM qa.test_case_versions WHERE test_case_id=$1 AND project_id=$2 ORDER BY version DESC",
      [id, projectId],
    );
    return result.rows.map((r) => ({
      version: r.version,
      changedAt: r.changed_at.toISOString(),
      snapshot: r.snapshot,
    }));
  }
  async workflow(projectId: string): Promise<BugWorkflow> {
    await this.pool.query(
      "INSERT INTO qa.project_bug_workflows(project_id) VALUES($1) ON CONFLICT DO NOTHING",
      [projectId],
    );
    const result = await this.pool.query<BugWorkflow>(
      'SELECT states,transitions,closed_states AS "closedStates",revision FROM qa.project_bug_workflows WHERE project_id=$1',
      [projectId],
    );
    return result.rows[0];
  }
  async saveWorkflow(projectId: string, input: BugWorkflow): Promise<BugWorkflow> {
    return this.transaction(async (client) => {
      await client.query(
        "INSERT INTO qa.project_bug_workflows(project_id) VALUES($1) ON CONFLICT DO NOTHING",
        [projectId],
      );
      const config = await client.query<BugWorkflow>(
        'SELECT states,transitions,closed_states AS "closedStates",revision FROM qa.project_bug_workflows WHERE project_id=$1 FOR UPDATE',
        [projectId],
      );
      if (config.rows[0].revision !== input.revision)
        throw new HttpError(409, "WORKFLOW_CONFLICT", "El flujo cambió. Actualiza la página.");
      const invalid = await client.query(
        "SELECT 1 FROM qa.bugs WHERE project_id=$1 AND NOT(status=ANY($2::text[])) LIMIT 1",
        [projectId, input.states],
      );
      if (invalid.rowCount)
        throw new HttpError(
          409,
          "WORKFLOW_IN_USE",
          "No puedes retirar estados que todavía usan los bugs.",
        );
      const result = await client.query<BugWorkflow>(
        'UPDATE qa.project_bug_workflows SET states=$2,transitions=$3,closed_states=$4,revision=revision+1 WHERE project_id=$1 RETURNING states,transitions,closed_states AS "closedStates",revision',
        [
          projectId,
          JSON.stringify(input.states),
          JSON.stringify(input.transitions),
          JSON.stringify(input.closedStates ?? input.states.filter((s) => s === "Resuelto")),
        ],
      );
      return result.rows[0];
    });
  }
}
