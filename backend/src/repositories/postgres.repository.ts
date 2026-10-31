import { PostgresAnalyticsRepository } from "./analytics.repository.js";
import { PostgresCollaborationRepository } from "./collaboration.repository.js";
import { actorDatabase } from "../auth/actor-database.js";
import type { DatabasePool, DatabaseClient } from "../auth/actor-database.js";
import { PostgresQualityRepository } from "./quality.repository.js";
import { previousCreation, rememberCreation, requireCreatedRow } from "./creation-request.js";
import type { CreationContext } from "./creation-request.js";
import { listSql } from "./list-query.js";
import type { ListQuery } from "./list-query.js";
import type {
  BaseRow,
  BugRow,
  CaseRow,
  RunRow,
  EvidenceRow,
  AttachmentRow,
  TagRow,
} from "./postgres.rows.js";

import type { Repository } from "./repository.js";
import type { BugStatus, CreateBugInput, UpdateBugInput } from "../models/bug.model.js";
import type {
  TestCaseAttachment,
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
import type { CreateTagInput, Tag, UpdateTagInput } from "../models/tag.model.js";
import type {
  CreateEvidenceInput,
  EvidenceFile,
  UpdateEvidenceInput,
} from "../models/evidence.model.js";
import { HttpError } from "../http-error.js";
import { parseReference, resourceId } from "../validation.js";
export type { DatabasePool } from "../auth/actor-database.js";

const common = (r: BaseRow, prefix: string) => ({
  id: resourceId(prefix, r.id),
  projectId: r.project_id,
  createdAt: r.created_at.toISOString(),
});
const bug = (r: BugRow) => ({
  ...common(r, "BUG"),
  title: r.title,
  project: r.project,
  description: r.description,
  priority: r.priority,
  severity: r.severity ?? "Media",
  environment: r.environment ?? "",
  affectedVersion: r.affected_version ?? "",
  sourceResultId: r.source_result_id ? resourceId("RES", r.source_result_id) : null,
  sourceRunId: r.source_run_id ? resourceId("RUN", r.source_run_id) : null,
  sourceCaseId: r.source_case_id ? resourceId("TC", r.source_case_id) : null,
  sourceSteps: r.source_steps ?? [],
  status: r.status,
  assignee: r.assigned_name ?? r.assignee,
  assigneeUserId: r.assignee_user_id ?? null,
  tagIds: r.tag_ids ?? [],
});
const testCase = (r: CaseRow) => ({
  ...common(r, "TC"),
  title: r.title,
  suite: r.suite ?? "",
  testType: r.test_type ?? "Funcional",
  lifecycle: r.lifecycle ?? "Borrador",
  version: r.version ?? 1,
  status: r.status,
  preconditions: r.preconditions,
  assigneeUserId: r.assignee_user_id ?? null,
  assigneeName: r.assigned_name ?? null,
  steps: r.steps ?? [],
  tagIds: (r.tag_ids as string[] | undefined) ?? [],
});
const run = (r: RunRow) => ({
  ...common(r, "RUN"),
  title: r.title,
  owner: r.owner,
  planId: r.plan_id ? resourceId("PLAN", r.plan_id) : null,
  sourceRunId: r.source_run_id ? resourceId("RUN", r.source_run_id) : null,
  status: r.status,
  caseIds: r.case_ids.map((id) => resourceId("TC", id)),
  caseCount: r.case_ids.length,
  progress: r.progress,
  tagIds: (r.tag_ids as string[] | undefined) ?? [],
  results: r.results ?? [],
});
const evidence = (r: EvidenceRow) => ({
  ...common(r, "EVD"),
  name: r.name,
  type: r.type,
  sizeBytes: Number(r.size_bytes),
  hasFile: Boolean(r.has_file),
  related: r.related ?? [],
});
const caseAttachment = (r: AttachmentRow) => ({
  id: resourceId("TCA", r.id),
  projectId: r.project_id,
  testCaseId: resourceId("TC", r.test_case_id),
  kind: r.kind,
  name: r.name,
  url: r.external_url,
  mediaType: r.content_type,
  createdAt: r.created_at.toISOString(),
});

const casesSql = `SELECT c.*, (SELECT u.name FROM qa.users u WHERE u.id=c.assignee_user_id) AS assigned_name, COALESCE((SELECT json_agg(json_build_object('action', s.action, 'expectedResult', s.expected_result) ORDER BY s.position)
 FROM qa.test_case_steps s WHERE s.test_case_id=c.id), '[]'::json) AS steps,
 COALESCE((SELECT array_agg(tc.tag_id::text ORDER BY tc.tag_id) FROM qa.test_case_tags tc WHERE tc.test_case_id=c.id), ARRAY[]::text[]) AS tag_ids FROM qa.test_cases c`;
const runsSql = `SELECT r.*, COALESCE((SELECT array_agg(rr.test_case_id::text ORDER BY rr.test_case_id) FROM qa.test_run_results rr WHERE rr.test_run_id=r.id), ARRAY[]::text[]) AS case_ids,
 COALESCE((SELECT round(100.0 * count(*) FILTER (WHERE rr.executed_at IS NOT NULL) / NULLIF(count(*),0))::integer FROM qa.test_run_results rr WHERE rr.test_run_id=r.id),0) AS progress,
 COALESCE((SELECT json_agg(json_build_object('id', 'RES-' || lpad(rr.id::text,greatest(3,length(rr.id::text)),'0'),
 'caseId','TC-' || lpad(c.id::text,greatest(3,length(c.id::text)),'0'), 'title',COALESCE(rr.title_snapshot,c.title),'caseVersion',COALESCE(rr.case_version,1),'status',rr.status,'notes',rr.notes,'executedAt',rr.executed_at,
 'steps',COALESCE((SELECT json_agg(json_build_object('action',s.value->>'action','expectedResult',COALESCE(s.value->>'expected_result',s.value->>'expectedResult','')) ORDER BY s.position)
 FROM jsonb_array_elements(rr.steps_snapshot) WITH ORDINALITY s(value,position)),'[]'::json)) ORDER BY rr.test_case_id)
 FROM qa.test_run_results rr JOIN qa.test_cases c ON c.id=rr.test_case_id AND c.project_id=rr.project_id WHERE rr.test_run_id=r.id),'[]'::json) AS results,
 COALESCE((SELECT array_agg(rt.tag_id::text ORDER BY rt.tag_id) FROM qa.test_run_tags rt WHERE rt.test_run_id=r.id), ARRAY[]::text[]) AS tag_ids FROM qa.test_runs r`;
const evidenceSql = `SELECT e.id, e.project_id, e.name, e.type, e.size_bytes, e.created_at,
 e.file_bytes IS NOT NULL AS has_file, COALESCE((SELECT json_agg(
 CASE WHEN l.bug_id IS NOT NULL THEN 'BUG-' || lpad(l.bug_id::text,greatest(3,length(l.bug_id::text)),'0')
 WHEN l.test_case_id IS NOT NULL THEN 'TC-' || lpad(l.test_case_id::text,greatest(3,length(l.test_case_id::text)),'0')
 WHEN l.test_run_id IS NOT NULL THEN 'RUN-' || lpad(l.test_run_id::text,greatest(3,length(l.test_run_id::text)),'0')
 ELSE 'RES-' || lpad(l.test_run_result_id::text,greatest(3,length(l.test_run_result_id::text)),'0') END ORDER BY l.id)
 FROM qa.evidence_links l WHERE l.evidence_id=e.id),'[]'::json) AS related FROM qa.evidence e`;

export class PostgresRepository implements Repository {
  forActor(actorId: string, requestId: string) {
    return new PostgresRepository(actorDatabase(this.pool, actorId, requestId), actorId);
  }
  readonly collaboration?: PostgresCollaborationRepository;
  readonly analytics: PostgresAnalyticsRepository;
  readonly quality: PostgresQualityRepository;
  constructor(
    private readonly pool: DatabasePool,
    actorId?: string,
  ) {
    if (actorId) this.collaboration = new PostgresCollaborationRepository(pool, actorId);
    this.analytics = new PostgresAnalyticsRepository(pool);
    this.quality = new PostgresQualityRepository(pool);
  }
  async health() {
    await this.pool.query("SELECT 1");
  }
  async listProjects() {
    const { rows } = await this.pool.query<import("./repository.js").Project>(
      'SELECT id::text, organization_id::text AS "organizationId", name, description FROM qa.projects ORDER BY id',
    );
    return rows;
  }
  async listBugs(projectId?: string, options?: ListQuery) {
    const query = listSql("b", projectId, options, [
      "b.title",
      "b.id::text",
      "p.name",
      "b.priority",
      "b.status",
    ]);
    const { rows } = await this.pool.query<BugRow>(
      `SELECT b.*, (SELECT rr.test_run_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_run_id, (SELECT rr.test_case_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_case_id, (SELECT COALESCE(json_agg(json_build_object('action',v->>'action','expectedResult',COALESCE(v->>'expectedResult',v->>'expected_result'))),'[]'::json) FROM qa.test_run_results rr, jsonb_array_elements(rr.steps_snapshot) v WHERE rr.id=b.source_result_id) AS source_steps, (SELECT u.name FROM qa.users u WHERE u.id=b.assignee_user_id) AS assigned_name, p.name AS project, COALESCE((SELECT array_agg(bt.tag_id::text ORDER BY bt.tag_id) FROM qa.bug_tags bt WHERE bt.bug_id=b.id), ARRAY[]::text[]) AS tag_ids FROM qa.bugs b JOIN qa.projects p ON p.id=b.project_id ${query.sql}`,
      query.values,
    );
    return rows.map(bug);
  }
  async createBug(input: CreateBugInput, context?: CreationContext) {
    return this.transaction(async (client) => {
      const previous = await previousCreation(client, "bug", input.projectId, input, context);
      if (previous) {
        const result = await client.query<BugRow>(
          `SELECT b.*, (SELECT rr.test_run_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_run_id, (SELECT rr.test_case_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_case_id, (SELECT COALESCE(json_agg(json_build_object('action',v->>'action','expectedResult',COALESCE(v->>'expectedResult',v->>'expected_result'))),'[]'::json) FROM qa.test_run_results rr, jsonb_array_elements(rr.steps_snapshot) v WHERE rr.id=b.source_result_id) AS source_steps,p.name AS project,(SELECT u.name FROM qa.users u WHERE u.id=b.assignee_user_id) AS assigned_name,COALESCE((SELECT array_agg(bt.tag_id::text ORDER BY bt.tag_id) FROM qa.bug_tags bt WHERE bt.bug_id=b.id),ARRAY[]::text[]) AS tag_ids FROM qa.bugs b JOIN qa.projects p ON p.id=b.project_id WHERE b.id=$1 AND b.project_id=$2`,
          [previous, input.projectId],
        );
        return bug(requireCreatedRow(result.rows[0]));
      }
      let failure:
        { id: string; test_case_id: string; test_run_id: string; notes: string } | undefined;
      if (input.sourceResultId) {
        // Same lock order as result edits, then failure row; source is checked in this transaction.
        const source = parseReference(input.sourceResultId, "RES");
        await client.query(
          "SELECT r.id FROM qa.test_runs r JOIN qa.test_run_results rr ON rr.test_run_id=r.id WHERE rr.id=$1 AND rr.project_id=$2 FOR UPDATE OF r",
          [source, input.projectId],
        );
        const found = await client.query<{
          id: string;
          test_case_id: string;
          test_run_id: string;
          notes: string;
        }>(
          "SELECT id::text,test_case_id::text,test_run_id::text,notes FROM qa.test_run_results WHERE id=$1 AND project_id=$2 AND status='failed' AND executed_at IS NOT NULL FOR UPDATE",
          [source, input.projectId],
        );
        failure = found.rows[0];
        if (!failure)
          throw new HttpError(
            400,
            "INVALID_FAILURE",
            "Selecciona un resultado fallido registrado del proyecto.",
          );
      }
      await this.validateAssignee(client, input.projectId, input.assigneeUserId);
      const { rows } = await client.query<BugRow>(
        `WITH inserted AS (INSERT INTO qa.bugs(project_id,title,description,priority,assignee,assignee_user_id,assignee_organization_id,severity,environment,affected_version,source_result_id) VALUES($1,$2,$3,$4,$5,$6,CASE WHEN $6::bigint IS NULL THEN NULL ELSE (SELECT organization_id FROM qa.projects WHERE id=$1) END,$7,$8,$9,$10) RETURNING *)
        SELECT b.*, (SELECT rr.test_run_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_run_id, (SELECT rr.test_case_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_case_id, (SELECT COALESCE(json_agg(json_build_object('action',v->>'action','expectedResult',COALESCE(v->>'expectedResult',v->>'expected_result'))),'[]'::json) FROM qa.test_run_results rr, jsonb_array_elements(rr.steps_snapshot) v WHERE rr.id=b.source_result_id) AS source_steps, (SELECT u.name FROM qa.users u WHERE u.id=b.assignee_user_id) AS assigned_name, p.name AS project, ARRAY[]::text[] AS tag_ids FROM inserted b JOIN qa.projects p ON p.id=b.project_id`,
        [
          input.projectId,
          input.title.trim(),
          input.description?.trim() ?? "",
          input.priority,
          input.assignee ?? null,
          input.assigneeUserId ?? null,
          input.severity ?? "Media",
          input.environment ?? "",
          input.affectedVersion ?? "",
          failure?.id ?? null,
        ],
      );
      if (failure) {
        await client.query(
          "INSERT INTO qa.bug_test_cases(project_id,bug_id,test_case_id) VALUES($1,$2,$3)",
          [input.projectId, rows[0].id, failure.test_case_id],
        );
        await client.query(
          `INSERT INTO qa.evidence_links(project_id,evidence_id,bug_id)
         SELECT DISTINCT $1::bigint,l.evidence_id,$2::bigint FROM qa.evidence_links l WHERE l.project_id=$1 AND (l.test_run_result_id=$3 OR l.test_run_id=$4 OR l.test_case_id=$5) ON CONFLICT DO NOTHING`,
          [input.projectId, rows[0].id, failure.id, failure.test_run_id, failure.test_case_id],
        );
      }
      await this.replaceTags(
        "qa.bug_tags",
        "bug_id",
        rows[0].id,
        input.projectId,
        input.tagIds,
        client,
      );
      const result = await client.query<BugRow>(
        `SELECT b.*, (SELECT rr.test_run_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_run_id, (SELECT rr.test_case_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_case_id, (SELECT COALESCE(json_agg(json_build_object('action',v->>'action','expectedResult',COALESCE(v->>'expectedResult',v->>'expected_result'))),'[]'::json) FROM qa.test_run_results rr, jsonb_array_elements(rr.steps_snapshot) v WHERE rr.id=b.source_result_id) AS source_steps, (SELECT u.name FROM qa.users u WHERE u.id=b.assignee_user_id) AS assigned_name, p.name AS project, COALESCE((SELECT array_agg(bt.tag_id::text ORDER BY bt.tag_id) FROM qa.bug_tags bt WHERE bt.bug_id=b.id), ARRAY[]::text[]) AS tag_ids FROM qa.bugs b JOIN qa.projects p ON p.id=b.project_id WHERE b.id=$1`,
        [rows[0].id],
      );
      await rememberCreation(client, "bug", input.projectId, rows[0].id, input, context);
      return bug(result.rows[0]);
    });
  }
  async updateBugStatus(id: string, projectId: string, status: BugStatus) {
    const { rows } = await this.pool.query<BugRow>(
      `WITH updated AS (
      UPDATE qa.bugs SET status=$3 WHERE id=$1 AND project_id=$2 RETURNING *
    ) SELECT b.*, (SELECT rr.test_run_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_run_id, (SELECT rr.test_case_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_case_id, (SELECT COALESCE(json_agg(json_build_object('action',v->>'action','expectedResult',COALESCE(v->>'expectedResult',v->>'expected_result'))),'[]'::json) FROM qa.test_run_results rr, jsonb_array_elements(rr.steps_snapshot) v WHERE rr.id=b.source_result_id) AS source_steps, (SELECT u.name FROM qa.users u WHERE u.id=b.assignee_user_id) AS assigned_name, p.name AS project FROM updated b JOIN qa.projects p ON p.id=b.project_id`,
      [id, projectId, status],
    );
    if (!rows[0]) return null;
    const result = await this.pool.query<BugRow>(
      `SELECT b.*, (SELECT rr.test_run_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_run_id, (SELECT rr.test_case_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_case_id, (SELECT COALESCE(json_agg(json_build_object('action',v->>'action','expectedResult',COALESCE(v->>'expectedResult',v->>'expected_result'))),'[]'::json) FROM qa.test_run_results rr, jsonb_array_elements(rr.steps_snapshot) v WHERE rr.id=b.source_result_id) AS source_steps, (SELECT u.name FROM qa.users u WHERE u.id=b.assignee_user_id) AS assigned_name, p.name AS project, COALESCE((SELECT array_agg(bt.tag_id::text ORDER BY bt.tag_id) FROM qa.bug_tags bt WHERE bt.bug_id=b.id), ARRAY[]::text[]) AS tag_ids FROM qa.bugs b JOIN qa.projects p ON p.id=b.project_id WHERE b.id=$1`,
      [id],
    );
    return bug(result.rows[0]);
  }
  async updateBug(id: string, projectId: string, input: UpdateBugInput) {
    return this.transaction(async (client) => {
      await this.validateAssignee(client, projectId, input.assigneeUserId);
      const { rows } = await client.query<BugRow>(
        `WITH updated AS (
        UPDATE qa.bugs SET title=$3,description=COALESCE($4,description),priority=$5,
          severity=COALESCE($11,severity),environment=COALESCE($12,environment),affected_version=COALESCE($13,affected_version),
          assignee=CASE WHEN $8 THEN $6 ELSE assignee END,status=COALESCE($7,status),
          assignee_user_id=CASE WHEN $10 THEN $9::bigint ELSE assignee_user_id END,
          assignee_organization_id=CASE WHEN $10 THEN CASE WHEN $9::bigint IS NULL THEN NULL ELSE (SELECT organization_id FROM qa.projects WHERE id=$2) END ELSE assignee_organization_id END
        WHERE id=$1 AND project_id=$2 RETURNING *
      ) SELECT b.*, (SELECT rr.test_run_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_run_id, (SELECT rr.test_case_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_case_id, (SELECT COALESCE(json_agg(json_build_object('action',v->>'action','expectedResult',COALESCE(v->>'expectedResult',v->>'expected_result'))),'[]'::json) FROM qa.test_run_results rr, jsonb_array_elements(rr.steps_snapshot) v WHERE rr.id=b.source_result_id) AS source_steps, (SELECT u.name FROM qa.users u WHERE u.id=b.assignee_user_id) AS assigned_name, p.name AS project FROM updated b JOIN qa.projects p ON p.id=b.project_id`,
        [
          id,
          projectId,
          input.title.trim(),
          input.description?.trim() ?? null,
          input.priority,
          input.assignee?.trim() || null,
          input.status ?? null,
          input.assignee !== undefined,
          input.assigneeUserId ?? null,
          input.assigneeUserId !== undefined,
          input.severity ?? null,
          input.environment ?? null,
          input.affectedVersion ?? null,
        ],
      );
      if (!rows[0]) return null;
      await this.replaceTags("qa.bug_tags", "bug_id", id, projectId, input.tagIds, client);
      const result = await client.query<BugRow>(
        `SELECT b.*, (SELECT rr.test_run_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_run_id, (SELECT rr.test_case_id::text FROM qa.test_run_results rr WHERE rr.id=b.source_result_id) AS source_case_id, (SELECT COALESCE(json_agg(json_build_object('action',v->>'action','expectedResult',COALESCE(v->>'expectedResult',v->>'expected_result'))),'[]'::json) FROM qa.test_run_results rr, jsonb_array_elements(rr.steps_snapshot) v WHERE rr.id=b.source_result_id) AS source_steps, (SELECT u.name FROM qa.users u WHERE u.id=b.assignee_user_id) AS assigned_name, p.name AS project, COALESCE((SELECT array_agg(bt.tag_id::text ORDER BY bt.tag_id) FROM qa.bug_tags bt WHERE bt.bug_id=b.id), ARRAY[]::text[]) AS tag_ids FROM qa.bugs b JOIN qa.projects p ON p.id=b.project_id WHERE b.id=$1 AND b.project_id=$2`,
        [id, projectId],
      );
      return result.rows[0] ? bug(result.rows[0]) : null;
    });
  }
  async deleteBug(id: string, projectId: string) {
    try {
      const result = await this.pool.query("DELETE FROM qa.bugs WHERE id=$1 AND project_id=$2", [
        id,
        projectId,
      ]);
      return result.rowCount === 1;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23503"
      ) {
        throw new HttpError(
          409,
          "BUG_IN_USE",
          "El bug tiene casos o evidencias vinculadas; no se puede eliminar.",
        );
      }
      throw error;
    }
  }
  async listCases(projectId?: string, options?: ListQuery) {
    const query = listSql("c", projectId, options, [
      "c.title",
      "c.id::text",
      "COALESCE(c.suite,'')",
      "c.status",
    ]);
    const { rows } = await this.pool.query<CaseRow>(`${casesSql} ${query.sql}`, query.values);
    return rows.map(testCase);
  }
  async createCase(input: CreateTestCaseInput, context?: CreationContext) {
    return this.transaction(async (client) => {
      const previous = await previousCreation(client, "case", input.projectId, input, context);
      if (previous) {
        const result = await client.query<CaseRow>(
          `${casesSql} WHERE c.id=$1 AND c.project_id=$2`,
          [previous, input.projectId],
        );
        return testCase(requireCreatedRow(result.rows[0]));
      }
      await this.validateAssignee(client, input.projectId, input.assigneeUserId);
      const { rows } = await client.query<CaseRow>(
        "INSERT INTO qa.test_cases(project_id,title,suite,preconditions,assignee_user_id,assignee_organization_id,test_type,lifecycle) VALUES($1,$2,$3,$4,$5,CASE WHEN $5::bigint IS NULL THEN NULL ELSE (SELECT organization_id FROM qa.projects WHERE id=$1) END,$6,$7) RETURNING *",
        [
          input.projectId,
          input.title.trim(),
          input.suite?.trim() || null,
          input.preconditions?.trim() ?? "",
          input.assigneeUserId ?? null,
          input.testType?.trim() ?? "Funcional",
          input.lifecycle ?? "Borrador",
        ],
      );
      const id = rows[0].id;
      await this.replaceTags(
        "qa.test_case_tags",
        "test_case_id",
        id,
        input.projectId,
        input.tagIds,
        client,
      );
      for (const [index, step] of (input.steps ?? []).entries()) {
        await client.query(
          "INSERT INTO qa.test_case_steps(project_id,test_case_id,position,action,expected_result) VALUES($1,$2,$3,$4,$5)",
          [input.projectId, id, index + 1, step.action.trim(), step.expectedResult.trim()],
        );
      }
      const result = await client.query<CaseRow>(`${casesSql} WHERE c.id=$1`, [id]);
      await rememberCreation(client, "case", input.projectId, id, input, context);
      return testCase(result.rows[0]);
    });
  }
  async updateCase(id: string, projectId: string, input: UpdateTestCaseInput) {
    return this.transaction(async (client) => {
      const locked = await client.query<{ version: number }>(
        "SELECT version FROM qa.test_cases WHERE id=$1 AND project_id=$2 FOR UPDATE",
        [id, projectId],
      );
      if (!locked.rows[0]) return null;
      if (input.expectedVersion !== undefined && input.expectedVersion !== locked.rows[0].version)
        throw new HttpError(
          409,
          "CASE_VERSION_CONFLICT",
          "El caso cambió. Vuelve a abrirlo antes de guardar.",
        );
      await this.validateAssignee(client, projectId, input.assigneeUserId);
      const { rows } = await client.query<CaseRow>(
        "UPDATE qa.test_cases SET title=$3,suite=$4,preconditions=$5,test_type=COALESCE($8,test_type),lifecycle=COALESCE($9,lifecycle),assignee_user_id=CASE WHEN $7 THEN $6::bigint ELSE assignee_user_id END,assignee_organization_id=CASE WHEN $7 THEN CASE WHEN $6::bigint IS NULL THEN NULL ELSE (SELECT organization_id FROM qa.projects WHERE id=$2) END ELSE assignee_organization_id END WHERE id=$1 AND project_id=$2 RETURNING id",
        [
          id,
          projectId,
          input.title.trim(),
          input.suite?.trim() || null,
          input.preconditions?.trim() ?? "",
          input.assigneeUserId ?? null,
          input.assigneeUserId !== undefined,
          input.testType?.trim() ?? null,
          input.lifecycle ?? null,
        ],
      );
      if (!rows[0]) return null;
      await this.replaceTags(
        "qa.test_case_tags",
        "test_case_id",
        id,
        projectId,
        input.tagIds,
        client,
      );
      await client.query("DELETE FROM qa.test_case_steps WHERE project_id=$1 AND test_case_id=$2", [
        projectId,
        id,
      ]);
      for (const [index, step] of (input.steps ?? []).entries()) {
        await client.query(
          "INSERT INTO qa.test_case_steps(project_id,test_case_id,position,action,expected_result) VALUES($1,$2,$3,$4,$5)",
          [projectId, id, index + 1, step.action.trim(), step.expectedResult.trim()],
        );
      }
      const result = await client.query<CaseRow>(`${casesSql} WHERE c.id=$1 AND c.project_id=$2`, [
        id,
        projectId,
      ]);
      return testCase(result.rows[0]);
    });
  }
  async deleteCase(id: string, projectId: string) {
    try {
      return await this.transaction(async (client) => {
        await client.query(
          "DELETE FROM qa.test_case_attachments WHERE test_case_id=$1 AND project_id=$2",
          [id, projectId],
        );
        await client.query(
          "DELETE FROM qa.test_case_steps WHERE test_case_id=$1 AND project_id=$2",
          [id, projectId],
        );
        const { rowCount } = await client.query(
          "DELETE FROM qa.test_cases WHERE id=$1 AND project_id=$2",
          [id, projectId],
        );
        return rowCount === 1;
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23503"
      ) {
        throw new HttpError(
          409,
          "TEST_CASE_IN_USE",
          "El caso pertenece a una ejecución o tiene relaciones; no se puede eliminar.",
        );
      }
      throw error;
    }
  }
  async updateCaseStatus(id: string, projectId: string, status: TestCaseStatus) {
    const { rows } = await this.pool.query<CaseRow>(
      `WITH updated AS (
      UPDATE qa.test_cases SET status=$3 WHERE id=$1 AND project_id=$2 RETURNING *
    ) SELECT c.*, COALESCE((SELECT json_agg(json_build_object('action', s.action, 'expectedResult', s.expected_result) ORDER BY s.position)
      FROM qa.test_case_steps s WHERE s.test_case_id=c.id), '[]'::json) AS steps,
      COALESCE((SELECT array_agg(tc.tag_id::text ORDER BY tc.tag_id) FROM qa.test_case_tags tc WHERE tc.test_case_id=c.id), ARRAY[]::text[]) AS tag_ids FROM updated c`,
      [id, projectId, status],
    );
    return rows[0] ? testCase(rows[0]) : null;
  }
  async listCaseAttachments(id: string, projectId: string) {
    const { rows } = await this.pool.query<AttachmentRow>(
      "SELECT id::text, project_id, test_case_id::text, kind, name, external_url, content_type, created_at FROM qa.test_case_attachments WHERE test_case_id=$1 AND project_id=$2 ORDER BY id",
      [id, projectId],
    );
    return rows.map(caseAttachment);
  }
  async getCaseAttachment(id: string, attachmentId: string, projectId: string) {
    const { rows } = await this.pool.query<AttachmentRow>(
      "SELECT id::text, project_id, test_case_id::text, kind, name, external_url, content_type, image_bytes, created_at FROM qa.test_case_attachments WHERE test_case_id=$1 AND id=$2 AND project_id=$3",
      [id, attachmentId, projectId],
    );
    return rows[0]
      ? { ...caseAttachment(rows[0]), imageData: rows[0].image_bytes as Buffer | null }
      : null;
  }
  async createCaseAttachment(
    input: CreateTestCaseAttachmentInput,
  ): Promise<TestCaseAttachment | null> {
    const values =
      input.kind === "image"
        ? [
            input.projectId,
            input.testCaseId,
            input.kind,
            input.name.trim(),
            null,
            input.mediaType,
            input.imageData,
          ]
        : [input.projectId, input.testCaseId, input.kind, input.name.trim(), input.url, null, null];
    const { rows } = await this.pool.query<AttachmentRow>(
      `INSERT INTO qa.test_case_attachments(project_id,test_case_id,kind,name,external_url,content_type,image_bytes)
      SELECT $1,c.id,$3,$4,$5,$6,$7 FROM qa.test_cases c WHERE c.id=$2 AND c.project_id=$1
      RETURNING id::text, project_id, test_case_id::text, kind, name, external_url, content_type, created_at`,
      values,
    );
    return rows[0] ? caseAttachment(rows[0]) : null;
  }
  async deleteCaseAttachment(id: string, attachmentId: string, projectId: string) {
    const { rowCount } = await this.pool.query(
      "DELETE FROM qa.test_case_attachments WHERE test_case_id=$1 AND id=$2 AND project_id=$3",
      [id, attachmentId, projectId],
    );
    return rowCount === 1;
  }
  async listRuns(projectId?: string, options?: ListQuery) {
    const query = listSql("r", projectId, options, [
      "r.title",
      "r.id::text",
      "r.owner",
      "r.status",
    ]);
    const { rows } = await this.pool.query<RunRow>(`${runsSql} ${query.sql}`, query.values);
    return rows.map(run);
  }
  async createRun(input: CreateTestRunInput, context?: CreationContext) {
    return this.transaction(async (client) => {
      const previous = await previousCreation(client, "run", input.projectId, input, context);
      if (previous) {
        const result = await client.query<RunRow>(`${runsSql} WHERE r.id=$1 AND r.project_id=$2`, [
          previous,
          input.projectId,
        ]);
        return run(requireCreatedRow(result.rows[0]));
      }
      let selectedIds = input.caseIds ?? [];
      let sourcePlan: string | null = null;
      const sourceId = input.sourceRunId ? parseReference(input.sourceRunId, "RUN") : null;
      if (sourceId) {
        const source = await client.query<{ plan_id: string | null }>(
          "SELECT plan_id::text FROM qa.test_runs WHERE id=$1 AND project_id=$2 FOR UPDATE",
          [sourceId, input.projectId],
        );
        if (!source.rows[0])
          throw new HttpError(404, "RUN_NOT_FOUND", "Ejecución de origen no disponible.");
        sourcePlan = source.rows[0].plan_id;
        const results = await client.query<{ test_case_id: string }>(
          "SELECT test_case_id::text FROM qa.test_run_results WHERE test_run_id=$1 AND project_id=$2 AND (NOT $3::boolean OR (status='failed' AND executed_at IS NOT NULL)) ORDER BY test_case_id",
          [sourceId, input.projectId, input.failedOnly ?? false],
        );
        selectedIds = results.rows.map((r) => resourceId("TC", r.test_case_id));
      } else if (input.planId) {
        const planId = parseReference(input.planId, "PLAN");
        const plan = await client.query(
          "SELECT id FROM qa.test_plans WHERE id=$1 AND project_id=$2 FOR SHARE",
          [planId, input.projectId],
        );
        if (!plan.rowCount) throw new HttpError(404, "PLAN_NOT_FOUND", "Plan no disponible.");
        const members = await client.query<{ test_case_id: string }>(
          "SELECT test_case_id::text FROM qa.test_plan_cases WHERE plan_id=$1 AND project_id=$2 ORDER BY test_case_id",
          [planId, input.projectId],
        );
        selectedIds = members.rows.map((r) => resourceId("TC", r.test_case_id));
      }
      if (!selectedIds.length)
        throw new HttpError(
          400,
          "EMPTY_RUN",
          "Selecciona al menos un caso; no hay resultados elegibles para reejecutar.",
        );
      const { rows } = await client.query<RunRow>(
        "INSERT INTO qa.test_runs(project_id,title,owner,plan_id,source_run_id) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [
          input.projectId,
          input.title.trim(),
          input.owner.trim(),
          sourcePlan ?? (input.planId ? parseReference(input.planId, "PLAN") : null),
          sourceId,
        ],
      );
      const id = rows[0].id;
      await this.replaceTags(
        "qa.test_run_tags",
        "test_run_id",
        id,
        input.projectId,
        input.tagIds,
        client,
      );
      const caseIds = selectedIds.map((value) => parseReference(value, "TC")!);
      const inserted = sourceId
        ? await client.query(
            `INSERT INTO qa.test_run_results(project_id,test_run_id,test_case_id,steps_snapshot,title_snapshot,case_version)
       SELECT project_id,$2,test_case_id,steps_snapshot,title_snapshot,case_version FROM qa.test_run_results WHERE project_id=$1 AND test_run_id=$4 AND test_case_id=ANY($3::bigint[])`,
            [input.projectId, id, caseIds, sourceId],
          )
        : await client.query(
            `INSERT INTO qa.test_run_results(project_id,test_run_id,test_case_id,steps_snapshot,title_snapshot,case_version)
        SELECT $1,$2,c.id,COALESCE((SELECT jsonb_agg(jsonb_build_object('action',s.action,'expected_result',s.expected_result) ORDER BY s.position)
        FROM qa.test_case_steps s WHERE s.test_case_id=c.id),'[]'::jsonb),c.title,c.version
        FROM qa.test_cases c WHERE c.project_id=$1 AND c.id=ANY($3::bigint[]) AND c.lifecycle <> 'Obsoleto'`,
            [input.projectId, id, caseIds],
          );
      if (inserted.rowCount !== caseIds.length)
        throw new HttpError(
          400,
          "INVALID_REFERENCE",
          "Los casos deben existir y pertenecer al proyecto de la ejecución.",
        );
      const result = await client.query<RunRow>(`${runsSql} WHERE r.id=$1`, [id]);
      await rememberCreation(client, "run", input.projectId, id, input, context);
      return run(result.rows[0]);
    });
  }
  async updateRun(id: string, projectId: string, input: UpdateTestRunInput) {
    return this.transaction(async (client) => {
      const locked = await client.query(
        "SELECT id FROM qa.test_runs WHERE id=$1 AND project_id=$2 FOR UPDATE",
        [id, projectId],
      );
      if (!locked.rowCount) return null;
      const caseIds = input.caseIds.map((value) => parseReference(value, "TC")!);
      const linkedRemoval = await client.query(
        `SELECT 1 FROM qa.evidence_links l JOIN qa.test_run_results rr ON rr.id=l.test_run_result_id AND rr.project_id=l.project_id
        WHERE rr.test_run_id=$1 AND rr.project_id=$2 AND NOT(rr.test_case_id=ANY($3::bigint[])) LIMIT 1`,
        [id, projectId, caseIds],
      );
      if (linkedRemoval.rowCount)
        throw new HttpError(
          409,
          "RUN_REFERENCED",
          "No puedes retirar un caso cuyo resultado tiene evidencias vinculadas.",
        );
      const bugRemoval = await client.query(
        "SELECT 1 FROM qa.bugs b JOIN qa.test_run_results rr ON rr.id=b.source_result_id WHERE rr.test_run_id=$1 AND rr.project_id=$2 AND NOT(rr.test_case_id=ANY($3::bigint[])) LIMIT 1",
        [id, projectId, caseIds],
      );
      if (bugRemoval.rowCount)
        throw new HttpError(
          409,
          "RUN_REFERENCED",
          "El resultado tiene un bug vinculado; conserva su referencia.",
        );
      // Preserve existing results and snapshots for cases that remain selected.
      await client.query(
        "DELETE FROM qa.test_run_results WHERE test_run_id=$1 AND project_id=$2 AND NOT(test_case_id=ANY($3::bigint[]))",
        [id, projectId, caseIds],
      );
      await client.query(
        `INSERT INTO qa.test_run_results(project_id,test_run_id,test_case_id,steps_snapshot,title_snapshot,case_version)
        SELECT $1,$2,c.id,COALESCE((SELECT jsonb_agg(jsonb_build_object('action',s.action,'expected_result',s.expected_result) ORDER BY s.position)
        FROM qa.test_case_steps s WHERE s.test_case_id=c.id),'[]'::jsonb),c.title,c.version
        FROM qa.test_cases c WHERE c.project_id=$1 AND c.id=ANY($3::bigint[]) AND c.lifecycle <> 'Obsoleto' ON CONFLICT(test_run_id,test_case_id) DO NOTHING`,
        [projectId, id, caseIds],
      );
      const selected = await client.query(
        "SELECT id,executed_at FROM qa.test_run_results WHERE test_run_id=$1 AND project_id=$2",
        [id, projectId],
      );
      if (selected.rows.length !== caseIds.length)
        throw new HttpError(400, "INVALID_REFERENCE", "Los casos deben pertenecer al proyecto.");
      if (
        input.status === "Completado" &&
        (!selected.rows.length || selected.rows.some((row) => !row.executed_at))
      )
        throw new HttpError(
          409,
          "RUN_INCOMPLETE",
          "Registra un resultado para cada caso antes de completar la ejecución.",
        );
      await client.query(
        "UPDATE qa.test_runs SET title=$3,owner=$4,status=$5,completed_at=CASE WHEN $5='Completado' THEN COALESCE(completed_at,now()) ELSE NULL END WHERE id=$1 AND project_id=$2",
        [id, projectId, input.title.trim(), input.owner.trim(), input.status],
      );
      if (input.tagIds !== undefined)
        await this.replaceTags(
          "qa.test_run_tags",
          "test_run_id",
          id,
          projectId,
          input.tagIds,
          client,
        );
      const result = await client.query<RunRow>(`${runsSql} WHERE r.id=$1 AND r.project_id=$2`, [
        id,
        projectId,
      ]);
      return run(result.rows[0]);
    });
  }
  async updateRunResult(
    id: string,
    resultId: string,
    projectId: string,
    input: UpdateRunResultInput,
  ) {
    return this.transaction(async (client) => {
      const locked = await client.query(
        "SELECT status FROM qa.test_runs WHERE id=$1 AND project_id=$2 FOR UPDATE",
        [id, projectId],
      );
      if (!locked.rowCount) return null;
      if (locked.rows[0].status === "Completado")
        throw new HttpError(
          409,
          "RUN_COMPLETED",
          "Reabre la ejecución antes de cambiar sus resultados.",
        );
      const updated = await client.query(
        "UPDATE qa.test_run_results SET status=$4,notes=$5,executed_at=now() WHERE test_run_id=$1 AND id=$2 AND project_id=$3",
        [id, resultId, projectId, input.status, input.notes],
      );
      if (!updated.rowCount) return null;
      const result = await client.query<RunRow>(`${runsSql} WHERE r.id=$1 AND r.project_id=$2`, [
        id,
        projectId,
      ]);
      return run(result.rows[0]);
    });
  }
  async deleteRun(id: string, projectId: string) {
    return this.transaction(async (client) => {
      const locked = await client.query(
        "SELECT id FROM qa.test_runs WHERE id=$1 AND project_id=$2 FOR UPDATE",
        [id, projectId],
      );
      if (!locked.rowCount) return false;
      const linked = await client.query(
        `SELECT 1 FROM qa.evidence_links WHERE project_id=$2 AND (test_run_id=$1 OR test_run_result_id IN
        (SELECT id FROM qa.test_run_results WHERE test_run_id=$1 AND project_id=$2)) LIMIT 1`,
        [id, projectId],
      );
      if (linked.rowCount)
        throw new HttpError(
          409,
          "RUN_REFERENCED",
          "La ejecución o sus resultados tienen evidencias vinculadas; conserva sus referencias.",
        );
      const references = await client.query(
        "SELECT 1 FROM qa.test_runs WHERE source_run_id=$1 AND project_id=$2 UNION ALL SELECT 1 FROM qa.bugs b JOIN qa.test_run_results rr ON rr.id=b.source_result_id WHERE rr.test_run_id=$1 AND rr.project_id=$2 LIMIT 1",
        [id, projectId],
      );
      if (references.rowCount)
        throw new HttpError(
          409,
          "RUN_REFERENCED",
          "La ejecución tiene reejecuciones o bugs vinculados; conserva sus referencias.",
        );
      await client.query("DELETE FROM qa.test_run_results WHERE test_run_id=$1 AND project_id=$2", [
        id,
        projectId,
      ]);
      const removed = await client.query("DELETE FROM qa.test_runs WHERE id=$1 AND project_id=$2", [
        id,
        projectId,
      ]);
      return removed.rowCount === 1;
    });
  }
  async listEvidence(projectId?: string) {
    const { rows } = await this.pool.query<EvidenceRow>(
      `${evidenceSql} ${projectId ? "WHERE e.project_id=$1" : ""} ORDER BY e.id DESC`,
      projectId ? [projectId] : [],
    );
    return rows.map(evidence);
  }
  async createEvidence(input: CreateEvidenceInput) {
    return this.transaction(async (client) => {
      const { rows } = await client.query<EvidenceRow>(
        "INSERT INTO qa.evidence(project_id,name,type,size_bytes) VALUES($1,$2,$3,$4) RETURNING *",
        [input.projectId, input.name.trim(), input.type, input.sizeBytes],
      );
      const id = rows[0].id;
      if (input.related) {
        // Column names come exclusively from this allowlist, never from user input.
        const targets = {
          BUG: "bug_id",
          TC: "test_case_id",
          RUN: "test_run_id",
          RES: "test_run_result_id",
        } as const;
        const prefix = input.related.split("-")[0] as keyof typeof targets;
        const target = targets[prefix];
        const targetId = target && parseReference(input.related, prefix);
        if (!targetId)
          throw new HttpError(400, "INVALID_REFERENCE", "Referencia de evidencia inválida.");
        await client.query(
          `INSERT INTO qa.evidence_links(project_id,evidence_id,${target}) VALUES($1,$2,$3)`,
          [input.projectId, id, targetId],
        );
      }
      const result = await client.query<EvidenceRow>(`${evidenceSql} WHERE e.id=$1`, [id]);
      return evidence(result.rows[0]);
    });
  }
  async updateEvidence(id: string, projectId: string, input: UpdateEvidenceInput) {
    return this.transaction(async (client) => {
      const updated = await client.query(
        "UPDATE qa.evidence SET name=$3,type=$4,size_bytes=$5 WHERE id=$1 AND project_id=$2 RETURNING id",
        [id, projectId, input.name.trim(), input.type, input.sizeBytes],
      );
      if (!updated.rows[0]) return null;
      if (input.related !== undefined) {
        await client.query("DELETE FROM qa.evidence_links WHERE project_id=$1 AND evidence_id=$2", [
          projectId,
          id,
        ]);
        if (input.related) {
          const targets = {
            BUG: "bug_id",
            TC: "test_case_id",
            RUN: "test_run_id",
            RES: "test_run_result_id",
          } as const;
          const prefix = input.related.split("-")[0] as keyof typeof targets;
          const target = targets[prefix];
          const targetId = target && parseReference(input.related, prefix);
          if (!targetId)
            throw new HttpError(400, "INVALID_REFERENCE", "Referencia de evidencia inválida.");
          await client.query(
            `INSERT INTO qa.evidence_links(project_id,evidence_id,${target}) VALUES($1,$2,$3)`,
            [projectId, id, targetId],
          );
        }
      }
      const result = await client.query<EvidenceRow>(
        `${evidenceSql} WHERE e.id=$1 AND e.project_id=$2`,
        [id, projectId],
      );
      return evidence(result.rows[0]);
    });
  }
  async deleteEvidence(id: string, projectId: string) {
    return this.transaction(async (client) => {
      await client.query("DELETE FROM qa.evidence_links WHERE project_id=$1 AND evidence_id=$2", [
        projectId,
        id,
      ]);
      const { rowCount } = await client.query(
        "DELETE FROM qa.evidence WHERE id=$1 AND project_id=$2",
        [id, projectId],
      );
      return rowCount === 1;
    });
  }
  async saveEvidenceFile(
    id: string | null,
    projectId: string,
    file: EvidenceFile,
    related?: string | null,
  ) {
    return this.transaction(async (client) => {
      let evidenceId = id;
      if (evidenceId) {
        const { rows } = await client.query<EvidenceRow>(
          "UPDATE qa.evidence SET name=$3,type=$4,size_bytes=$5,media_type=$6,file_bytes=$7 WHERE id=$1 AND project_id=$2 RETURNING id",
          [
            evidenceId,
            projectId,
            file.name.trim(),
            evidenceTypeFor(file.mediaType),
            file.fileData.length,
            file.mediaType,
            file.fileData,
          ],
        );
        if (!rows[0]) return null;
      } else {
        const { rows } = await client.query<EvidenceRow>(
          "INSERT INTO qa.evidence(project_id,name,type,size_bytes,media_type,file_bytes) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
          [
            projectId,
            file.name.trim(),
            evidenceTypeFor(file.mediaType),
            file.fileData.length,
            file.mediaType,
            file.fileData,
          ],
        );
        evidenceId = rows[0].id;
      }
      if (related) {
        const targets = {
          BUG: "bug_id",
          TC: "test_case_id",
          RUN: "test_run_id",
          RES: "test_run_result_id",
        } as const;
        const prefix = related.split("-")[0] as keyof typeof targets;
        const target = targets[prefix];
        const targetId = target && parseReference(related, prefix);
        if (!targetId)
          throw new HttpError(400, "INVALID_REFERENCE", "Referencia de evidencia inválida.");
        await client.query(
          `INSERT INTO qa.evidence_links(project_id,evidence_id,${target}) VALUES($1,$2,$3)`,
          [projectId, evidenceId, targetId],
        );
      }
      const result = await client.query<EvidenceRow>(
        `${evidenceSql} WHERE e.id=$1 AND e.project_id=$2`,
        [evidenceId, projectId],
      );
      return result.rows[0] ? evidence(result.rows[0]) : null;
    });
  }
  async getEvidenceFile(id: string, projectId: string) {
    const { rows } = await this.pool.query<EvidenceRow>(
      "SELECT name, media_type, file_bytes, size_bytes FROM qa.evidence WHERE id=$1 AND project_id=$2 AND file_bytes IS NOT NULL",
      [id, projectId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      name: row.name,
      mediaType: row.media_type,
      fileData: row.file_bytes,
      sizeBytes: Number(row.size_bytes),
    };
  }
  async listTags(projectId: string): Promise<Tag[]> {
    const { rows } = await this.pool.query<TagRow>(
      "SELECT id::text, project_id::text, name, color, created_at FROM qa.tags WHERE project_id=$1 ORDER BY lower(name), id",
      [projectId],
    );
    return rows.map(tag);
  }
  async createTag(input: CreateTagInput): Promise<Tag> {
    try {
      const { rows } = await this.pool.query<TagRow>(
        "INSERT INTO qa.tags(project_id,name,color) VALUES($1,$2,$3) RETURNING id::text, project_id::text, name, color, created_at",
        [input.projectId, input.name.trim(), input.color],
      );
      return tag(rows[0]);
    } catch (error) {
      if (isUniqueViolation(error))
        throw new HttpError(409, "TAG_ALREADY_EXISTS", "Ya existe un tag con ese nombre.");
      throw error;
    }
  }
  async updateTag(id: string, projectId: string, input: UpdateTagInput): Promise<Tag | null> {
    try {
      const { rows } = await this.pool.query<TagRow>(
        "UPDATE qa.tags SET name=$3,color=$4 WHERE id=$1 AND project_id=$2 RETURNING id::text, project_id::text, name, color, created_at",
        [id, projectId, input.name.trim(), input.color],
      );
      return rows[0] ? tag(rows[0]) : null;
    } catch (error) {
      if (isUniqueViolation(error))
        throw new HttpError(409, "TAG_ALREADY_EXISTS", "Ya existe un tag con ese nombre.");
      throw error;
    }
  }
  async deleteTag(id: string, projectId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query<TagRow>(
      "DELETE FROM qa.tags WHERE id=$1 AND project_id=$2",
      [id, projectId],
    );
    return rowCount === 1;
  }
  private async validateAssignee(
    client: DatabaseClient,
    projectId: string,
    userId?: string | null,
  ) {
    if (!userId) return;
    const result = await client.query(
      `SELECT 1 FROM qa.projects p JOIN qa.organization_members m ON m.organization_id=p.organization_id
       JOIN qa.users u ON u.id=m.user_id AND u.is_active
       WHERE p.id=$1 AND m.user_id=$2 AND qa.project_role(p.id,u.id) IS NOT NULL FOR SHARE OF m,u`,
      [projectId, userId],
    );
    if (!result.rowCount)
      throw new HttpError(
        400,
        "INVALID_ASSIGNEE",
        "El responsable no pertenece al equipo del proyecto o está inactivo.",
      );
  }
  private async replaceTags(
    table: "qa.bug_tags" | "qa.test_case_tags" | "qa.test_run_tags",
    resourceColumn: "bug_id" | "test_case_id" | "test_run_id",
    resourceId: string,
    projectId: string,
    tagIds: string[] | undefined,
    client: DatabasePool | DatabaseClient = this.pool,
  ) {
    if (tagIds === undefined) return;
    await client.query(`DELETE FROM ${table} WHERE project_id=$1 AND ${resourceColumn}=$2`, [
      projectId,
      resourceId,
    ]);
    if (tagIds.length === 0) return;
    const inserted = await client.query(
      `INSERT INTO ${table}(project_id,${resourceColumn},tag_id)
       SELECT $1,$2,t.id FROM qa.tags t WHERE t.project_id=$1 AND t.id=ANY($3::bigint[])`,
      [projectId, resourceId, tagIds],
    );
    if (inserted.rowCount !== tagIds.length)
      throw new HttpError(400, "INVALID_TAG", "Todos los tags deben pertenecer al proyecto.");
  }
  private async transaction<T>(work: (client: DatabaseClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

function tag(row: TagRow): Tag {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: row.name,
    color: row.color,
    createdAt: row.created_at.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function evidenceTypeFor(mediaType: string): "Imagen" | "Video" | "Archivo" {
  return mediaType.startsWith("image/")
    ? "Imagen"
    : mediaType.startsWith("video/")
      ? "Video"
      : "Archivo";
}
