import type { Pool, PoolClient, QueryResultRow } from "pg";
import type { Repository } from "./repository.js";
import type { BugStatus, CreateBugInput } from "../models/bug.model.js";
import type { TestCaseStatus, CreateTestCaseInput } from "../models/test-case.model.js";
import type { CreateTestRunInput } from "../models/test-run.model.js";
import type { CreateEvidenceInput } from "../models/evidence.model.js";
import { HttpError } from "../http-error.js";
import { parseReference, resourceId } from "../validation.js";
export type DatabasePool = Pool;

interface Row extends QueryResultRow {
  id: string; project_id: string; created_at: Date; title: string;
}

const common = (r: Row, prefix: string) => ({ id: resourceId(prefix, r.id), projectId: r.project_id, createdAt: r.created_at.toISOString() });
const bug = (r: Row) => ({ ...common(r, "BUG"), title: r.title, project: r.project, description: r.description, priority: r.priority, status: r.status, assignee: r.assignee });
const testCase = (r: Row) => ({ ...common(r, "TC"), title: r.title, suite: r.suite ?? "", status: r.status, preconditions: r.preconditions, steps: r.steps ?? [] });
const run = (r: Row) => ({ ...common(r, "RUN"), title: r.title, owner: r.owner, status: r.status, caseIds: (r.case_ids as string[]).map((id) => resourceId("TC", id)), caseCount: r.case_ids.length, progress: r.progress });
const evidence = (r: Row) => ({ ...common(r, "EVD"), name: r.name, type: r.type, sizeBytes: Number(r.size_bytes), related: r.related ?? [] });

const casesSql = `SELECT c.*, COALESCE((SELECT json_agg(json_build_object('action', s.action, 'expectedResult', s.expected_result) ORDER BY s.position)
 FROM qa.test_case_steps s WHERE s.test_case_id=c.id), '[]'::json) AS steps FROM qa.test_cases c`;
const runsSql = `SELECT r.*, COALESCE((SELECT array_agg(rr.test_case_id::text ORDER BY rr.test_case_id) FROM qa.test_run_results rr WHERE rr.test_run_id=r.id), ARRAY[]::text[]) AS case_ids,
 COALESCE((SELECT round(100.0 * count(*) FILTER (WHERE rr.status <> 'skipped') / NULLIF(count(*),0))::integer FROM qa.test_run_results rr WHERE rr.test_run_id=r.id),0) AS progress FROM qa.test_runs r`;
const evidenceSql = `SELECT e.*, COALESCE((SELECT json_agg(
 CASE WHEN l.bug_id IS NOT NULL THEN 'BUG-' || lpad(l.bug_id::text,greatest(3,length(l.bug_id::text)),'0')
 WHEN l.test_case_id IS NOT NULL THEN 'TC-' || lpad(l.test_case_id::text,greatest(3,length(l.test_case_id::text)),'0')
 WHEN l.test_run_id IS NOT NULL THEN 'RUN-' || lpad(l.test_run_id::text,greatest(3,length(l.test_run_id::text)),'0')
 ELSE 'RES-' || lpad(l.test_run_result_id::text,greatest(3,length(l.test_run_result_id::text)),'0') END ORDER BY l.id)
 FROM qa.evidence_links l WHERE l.evidence_id=e.id),'[]'::json) AS related FROM qa.evidence e`;

export class PostgresRepository implements Repository {
  constructor(private readonly pool: Pool) { }
  async health() { await this.pool.query("SELECT 1"); }
  async listProjects() {
    const { rows } = await this.pool.query('SELECT id::text, organization_id::text AS "organizationId", name, description FROM qa.projects ORDER BY id');
    return rows;
  }
  async listBugs(projectId?: string) {
    const { rows } = await this.pool.query<Row>(`SELECT b.*, p.name AS project FROM qa.bugs b JOIN qa.projects p ON p.id=b.project_id ${projectId ? "WHERE b.project_id=$1" : ""} ORDER BY b.id DESC`, projectId ? [projectId] : []);
    return rows.map(bug);
  }
  async createBug(input: CreateBugInput) {
    const { rows } = await this.pool.query<Row>(`WITH inserted AS (INSERT INTO qa.bugs(project_id,title,description,priority,assignee) VALUES($1,$2,$3,$4,$5) RETURNING *)
      SELECT b.*, p.name AS project FROM inserted b JOIN qa.projects p ON p.id=b.project_id`, [input.projectId, input.title.trim(), input.description?.trim() ?? "", input.priority, input.assignee ?? null]);
    return bug(rows[0]);
  }
  async updateBugStatus(id: string, projectId: string, status: BugStatus) {
    const { rows } = await this.pool.query<Row>(`WITH updated AS (
      UPDATE qa.bugs SET status=$3 WHERE id=$1 AND project_id=$2 RETURNING *
    ) SELECT b.*, p.name AS project FROM updated b JOIN qa.projects p ON p.id=b.project_id`, [id, projectId, status]);
    return rows[0] ? bug(rows[0]) : null;
  }
  async listCases(projectId?: string) {
    const { rows } = await this.pool.query<Row>(`${casesSql} ${projectId ? "WHERE c.project_id=$1" : ""} ORDER BY c.id DESC`, projectId ? [projectId] : []);
    return rows.map(testCase);
  }
  async createCase(input: CreateTestCaseInput) {
    return this.transaction(async (client) => {
      const { rows } = await client.query<Row>("INSERT INTO qa.test_cases(project_id,title,suite,preconditions) VALUES($1,$2,$3,$4) RETURNING *", [input.projectId, input.title.trim(), input.suite?.trim() || null, input.preconditions?.trim() ?? ""]);
      const id = rows[0].id;
      for (const [index, step] of (input.steps ?? []).entries()) {
        await client.query("INSERT INTO qa.test_case_steps(project_id,test_case_id,position,action,expected_result) VALUES($1,$2,$3,$4,$5)", [input.projectId, id, index + 1, step.action.trim(), step.expectedResult.trim()]);
      }
      const result = await client.query<Row>(`${casesSql} WHERE c.id=$1`, [id]);
      return testCase(result.rows[0]);
    });
  }
  async updateCaseStatus(id: string, projectId: string, status: TestCaseStatus) {
    const { rows } = await this.pool.query<Row>(`WITH updated AS (
      UPDATE qa.test_cases SET status=$3 WHERE id=$1 AND project_id=$2 RETURNING *
    ) SELECT c.*, COALESCE((SELECT json_agg(json_build_object('action', s.action, 'expectedResult', s.expected_result) ORDER BY s.position)
      FROM qa.test_case_steps s WHERE s.test_case_id=c.id), '[]'::json) AS steps FROM updated c`, [id, projectId, status]);
    return rows[0] ? testCase(rows[0]) : null;
  }
  async listRuns(projectId?: string) {
    const { rows } = await this.pool.query<Row>(`${runsSql} ${projectId ? "WHERE r.project_id=$1" : ""} ORDER BY r.id DESC`, projectId ? [projectId] : []);
    return rows.map(run);
  }
  async createRun(input: CreateTestRunInput) {
    return this.transaction(async (client) => {
      const { rows } = await client.query<Row>("INSERT INTO qa.test_runs(project_id,title,owner) VALUES($1,$2,$3) RETURNING *", [input.projectId, input.title.trim(), input.owner.trim()]);
      const id = rows[0].id;
      const caseIds = (input.caseIds ?? []).map((value) => parseReference(value, "TC")!);
      const inserted = await client.query(`INSERT INTO qa.test_run_results(project_id,test_run_id,test_case_id,steps_snapshot)
        SELECT $1,$2,c.id,COALESCE((SELECT jsonb_agg(jsonb_build_object('position',s.position,'action',s.action,'expected_result',s.expected_result) ORDER BY s.position)
        FROM qa.test_case_steps s WHERE s.test_case_id=c.id),'[]'::jsonb)
        FROM qa.test_cases c WHERE c.project_id=$1 AND c.id=ANY($3::bigint[])`, [input.projectId, id, caseIds]);
      if (inserted.rowCount !== caseIds.length) throw new HttpError(400, "INVALID_REFERENCE", "Los casos deben existir y pertenecer al proyecto de la ejecución.");
      const result = await client.query<Row>(`${runsSql} WHERE r.id=$1`, [id]);
      return run(result.rows[0]);
    });
  }
  async listEvidence(projectId?: string) {
    const { rows } = await this.pool.query<Row>(`${evidenceSql} ${projectId ? "WHERE e.project_id=$1" : ""} ORDER BY e.id DESC`, projectId ? [projectId] : []);
    return rows.map(evidence);
  }
  async createEvidence(input: CreateEvidenceInput) {
    return this.transaction(async (client) => {
      const { rows } = await client.query<Row>("INSERT INTO qa.evidence(project_id,name,type,size_bytes) VALUES($1,$2,$3,$4) RETURNING *", [input.projectId, input.name.trim(), input.type, input.sizeBytes]);
      const id = rows[0].id;
      if (input.related) {
        // Column names come exclusively from this allowlist, never from user input.
        const targets = { BUG: "bug_id", TC: "test_case_id", RUN: "test_run_id", RES: "test_run_result_id" } as const;
        const prefix = input.related.split("-")[0] as keyof typeof targets;
        const target = targets[prefix];
        const targetId = target && parseReference(input.related, prefix);
        if (!targetId) throw new HttpError(400, "INVALID_REFERENCE", "Referencia de evidencia inválida.");
        await client.query(`INSERT INTO qa.evidence_links(project_id,evidence_id,${target}) VALUES($1,$2,$3)`, [input.projectId, id, targetId]);
      }
      const result = await client.query<Row>(`${evidenceSql} WHERE e.id=$1`, [id]);
      return evidence(result.rows[0]);
    });
  }
  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
}
