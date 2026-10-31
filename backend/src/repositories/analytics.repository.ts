import type { DatabaseClient, DatabasePool } from "../auth/actor-database.js";
import type {
  AnalyticsData,
  AnalyticsRange,
  AnalyticsRepository,
  CoveragePage,
  CoverageRow,
  Requirement,
  RequirementInput,
  RunReport,
} from "../models/analytics.model.js";
import {
  previousCreation,
  rememberCreation,
  requireCreatedRow,
  creationHash,
  type CreationContext,
} from "./creation-request.js";
import { HttpError } from "../http-error.js";
import { parseReference, resourceId } from "../validation.js";
const reqSql = `SELECT r.id::text,r.project_id::text,r.code,r.title,r.description,r.version,r.created_at,COALESCE((SELECT array_agg(rc.test_case_id::text ORDER BY rc.test_case_id) FROM qa.requirement_cases rc WHERE rc.requirement_id=r.id),ARRAY[]::text[]) AS case_ids FROM qa.requirements r`;
interface ReqRow {
  id: string;
  project_id: string;
  code: string;
  title: string;
  description: string;
  version: number;
  created_at: Date;
  case_ids: string[];
}
const toRequirement = (r: ReqRow): Requirement => ({
  id: resourceId("REQ", r.id),
  projectId: r.project_id,
  code: r.code,
  title: r.title,
  description: r.description,
  version: r.version,
  createdAt: r.created_at.toISOString(),
  caseIds: r.case_ids.map((id) => resourceId("TC", id)),
});
export class PostgresAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly pool: DatabasePool) {}
  private async transaction<T>(work: (c: DatabaseClient) => Promise<T>, read = false) {
    const c = await this.pool.connect();
    try {
      await c.query(read ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN");
      await c.query("SET LOCAL TIME ZONE 'UTC'");
      const result = await work(c);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async overview(projectId: string, range: AnalyticsRange): Promise<AnalyticsData> {
    return this.transaction(async (c) => {
      const values = [projectId, range.from, range.to];
      const totals = await c.query<AnalyticsData["summary"]>(
        `WITH results AS (SELECT rr.* FROM qa.test_run_results rr WHERE rr.project_id=$1 AND rr.executed_at>=$2::date AND rr.executed_at<($3::date+1)), summary AS (
 SELECT (SELECT count(*)::int FROM qa.bugs WHERE project_id=$1) AS bugs,
 (SELECT count(*)::int FROM qa.bugs b JOIN qa.project_bug_workflows w ON w.project_id=b.project_id WHERE b.project_id=$1 AND NOT(w.closed_states ? b.status)) AS "openBugs",
 (SELECT count(*)::int FROM qa.bugs b JOIN qa.project_bug_workflows w ON w.project_id=b.project_id WHERE b.project_id=$1 AND w.closed_states ? b.status) AS "closedBugs",
 (SELECT count(*)::int FROM qa.test_cases WHERE project_id=$1) AS cases,
 (SELECT count(*)::int FROM qa.test_cases WHERE project_id=$1 AND lifecycle<>'Obsoleto') AS "activeCases",
 (SELECT count(*)::int FROM qa.test_runs WHERE project_id=$1) AS runs,
 (SELECT count(*)::int FROM qa.test_runs WHERE project_id=$1 AND status='En curso') AS "activeRuns",
 (SELECT count(*)::int FROM qa.test_runs WHERE project_id=$1 AND status='Completado') AS "completedRuns",
 (SELECT count(*)::int FROM qa.evidence WHERE project_id=$1) AS evidence,
 count(*)::int AS recorded,count(*) FILTER(WHERE status='passed')::int AS passed,count(*) FILTER(WHERE status='failed')::int AS failed,count(*) FILTER(WHERE status='blocked')::int AS blocked,count(*) FILTER(WHERE status='skipped')::int AS skipped,
 (SELECT count(*)::int FROM qa.requirements WHERE project_id=$1) AS requirements,
 (SELECT count(*)::int FROM qa.requirements r WHERE r.project_id=$1 AND EXISTS(SELECT 1 FROM qa.requirement_cases rc JOIN qa.test_cases tc ON tc.id=rc.test_case_id WHERE rc.requirement_id=r.id AND tc.lifecycle<>'Obsoleto')) AS "coveredRequirements" FROM results)
 SELECT *,CASE WHEN passed+failed+blocked=0 THEN NULL ELSE round(100.0*passed/(passed+failed+blocked))::int END AS "approvalRate" FROM summary`,
        values,
      );
      const runs = await c.query<{
        id: string;
        title: string;
        created_at: Date;
        recorded: number;
        evaluated: number;
        passed: number;
        failed: number;
        approval_rate: number | null;
      }>(
        `SELECT r.id::text,r.title,r.created_at,count(rr.id) FILTER(WHERE rr.executed_at IS NOT NULL)::int AS recorded,count(rr.id) FILTER(WHERE rr.executed_at IS NOT NULL AND rr.status<>'skipped')::int AS evaluated,count(rr.id) FILTER(WHERE rr.executed_at IS NOT NULL AND rr.status='passed')::int AS passed,count(rr.id) FILTER(WHERE rr.executed_at IS NOT NULL AND rr.status='failed')::int AS failed,round(100.0*count(rr.id) FILTER(WHERE rr.executed_at IS NOT NULL AND rr.status='passed')/NULLIF(count(rr.id) FILTER(WHERE rr.executed_at IS NOT NULL AND rr.status<>'skipped'),0))::int AS approval_rate FROM qa.test_runs r LEFT JOIN qa.test_run_results rr ON rr.test_run_id=r.id WHERE r.project_id=$1 AND r.created_at>=$2::date AND r.created_at<($3::date+1) GROUP BY r.id ORDER BY r.created_at DESC,r.id DESC LIMIT 60`,
        values,
      );
      const start = await c.query<{ since: Date }>(
        `SELECT greatest(p.created_at,m.applied_at) AS since FROM qa.projects p CROSS JOIN qa.schema_migrations m WHERE p.id=$1 AND m.version='015_analytics_coverage'`,
        [projectId],
      );
      const days = await c.query<{ date: string; open: number | null; closed: number | null }>(
        `WITH events AS (
 SELECT *,lag(is_closed) OVER(PARTITION BY bug_id ORDER BY occurred_at,id) AS prev_closed,lag(event) OVER(PARTITION BY bug_id ORDER BY occurred_at,id) AS prev_event FROM qa.bug_state_events WHERE project_id=$1 AND occurred_at<($3::date+1)
 ), deltas AS (SELECT (occurred_at AT TIME ZONE 'UTC')::date AS day,
 (CASE WHEN event<>'deleted' AND NOT is_closed THEN 1 ELSE 0 END)-(CASE WHEN prev_event IS NOT NULL AND prev_event<>'deleted' AND NOT prev_closed THEN 1 ELSE 0 END) AS opened,
 (CASE WHEN event<>'deleted' AND is_closed THEN 1 ELSE 0 END)-(CASE WHEN prev_event IS NOT NULL AND prev_event<>'deleted' AND prev_closed THEN 1 ELSE 0 END) AS closed FROM events
 ), daily AS (SELECT day,sum(opened) AS opened,sum(closed) AS closed FROM deltas GROUP BY day), series AS (
 SELECT d::date AS day,COALESCE((SELECT sum(opened) FROM daily WHERE day<$2::date),0)+sum(COALESCE(x.opened,0)) OVER(ORDER BY d) AS opened,
 COALESCE((SELECT sum(closed) FROM daily WHERE day<$2::date),0)+sum(COALESCE(x.closed,0)) OVER(ORDER BY d) AS closed FROM generate_series($2::date,$3::date,'1 day') d LEFT JOIN daily x ON x.day=d::date)
 SELECT to_char(day,'YYYY-MM-DD') AS date,CASE WHEN day+1<=$4::timestamptz THEN NULL ELSE opened::int END AS open,CASE WHEN day+1<=$4::timestamptz THEN NULL ELSE closed::int END AS closed FROM series ORDER BY day`,
        [...values, start.rows[0].since.toISOString()],
      );
      const failures = await c.query<{
        case_id: string;
        title: string;
        failures: number;
        executions: number;
      }>(
        `SELECT tc.id::text AS case_id,tc.title,count(*) FILTER(WHERE rr.status='failed')::int AS failures,count(*) FILTER(WHERE rr.status<>'skipped')::int AS executions FROM qa.test_run_results rr JOIN qa.test_cases tc ON tc.id=rr.test_case_id WHERE rr.project_id=$1 AND rr.executed_at>=$2::date AND rr.executed_at<($3::date+1) GROUP BY tc.id HAVING count(*) FILTER(WHERE rr.status='failed')>0 ORDER BY failures DESC,executions DESC,tc.id LIMIT 10`,
        values,
      );
      const types = await c.query<AnalyticsData["typeCoverage"][number]>(
        `SELECT tc.test_type AS type,count(*)::int AS total,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM qa.test_run_results rr WHERE rr.test_case_id=tc.id AND rr.executed_at IS NOT NULL))::int AS executed FROM qa.test_cases tc WHERE tc.project_id=$1 AND tc.lifecycle<>'Obsoleto' GROUP BY tc.test_type ORDER BY tc.test_type`,
        [projectId],
      );
      return {
        range,
        historySince: start.rows[0].since.toISOString(),
        generatedAt: new Date().toISOString(),
        summary: totals.rows[0],
        runTrend: runs.rows.reverse().map((r) => ({
          id: resourceId("RUN", r.id),
          title: r.title,
          createdAt: r.created_at.toISOString(),
          recorded: r.recorded,
          evaluated: r.evaluated,
          passed: r.passed,
          failed: r.failed,
          approvalRate: r.approval_rate,
        })),
        bugTrend: days.rows,
        frequentFailures: failures.rows.map((r) => ({
          caseId: resourceId("TC", r.case_id),
          title: r.title,
          failures: r.failures,
          executions: r.executions,
        })),
        typeCoverage: types.rows,
      };
    }, true);
  }
  async requirements(projectId: string, limit: number, offset: number, search: string) {
    return this.transaction(async (c) => {
      const query = `WHERE r.project_id=$1 AND (r.code ILIKE $2 ESCAPE '\\' OR r.title ILIKE $2 ESCAPE '\\')`;
      const value = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
      const count = await c.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM qa.requirements r ${query}`,
        [projectId, value],
      );
      const rows = await c.query<ReqRow>(
        `${reqSql} ${query} ORDER BY r.id DESC LIMIT $3 OFFSET $4`,
        [projectId, value, limit, offset],
      );
      return { items: rows.rows.map(toRequirement), total: count.rows[0].total };
    }, true);
  }
  async saveRequirement(
    projectId: string,
    id: string | null,
    input: RequirementInput,
    context?: CreationContext,
  ): Promise<Requirement> {
    return this.transaction(async (c) => {
      await c.query("SELECT qa.require_permission($1,'cases.write')", [projectId]);
      const previous = id
        ? null
        : await previousCreation(c, "requirement", projectId, input, context);
      if (previous) {
        const r = await c.query<ReqRow>(`${reqSql} WHERE r.id=$1 AND r.project_id=$2`, [
          previous,
          projectId,
        ]);
        return toRequirement(requireCreatedRow(r.rows[0]));
      }
      let saved: string;
      if (id) {
        const r = await c.query<{ id: string }>(
          `UPDATE qa.requirements SET code=$3,title=$4,description=$5,version=version+1 WHERE id=$1 AND project_id=$2 AND version=$6 RETURNING id::text`,
          [id, projectId, input.code.trim(), input.title.trim(), input.description, input.version],
        );
        if (!r.rows[0])
          throw new HttpError(
            409,
            "REQUIREMENT_CONFLICT",
            "El requisito cambió. Actualiza la lista.",
          );
        saved = r.rows[0].id;
      } else {
        const r = await c.query<{ id: string }>(
          "INSERT INTO qa.requirements(project_id,code,title,description) VALUES($1,$2,$3,$4) RETURNING id::text",
          [projectId, input.code.trim(), input.title.trim(), input.description],
        );
        saved = r.rows[0].id;
      }
      await c.query("DELETE FROM qa.requirement_cases WHERE project_id=$1 AND requirement_id=$2", [
        projectId,
        saved,
      ]);
      for (const value of input.caseIds)
        await c.query(
          "INSERT INTO qa.requirement_cases(project_id,requirement_id,test_case_id) VALUES($1,$2,$3)",
          [projectId, saved, parseReference(value, "TC")],
        );
      const result = await c.query<ReqRow>(`${reqSql} WHERE r.id=$1 AND r.project_id=$2`, [
        saved,
        projectId,
      ]);
      if (!id) await rememberCreation(c, "requirement", projectId, saved, input, context);
      return toRequirement(result.rows[0]);
    });
  }
  async deleteRequirement(projectId: string, id: string, version: number) {
    return this.transaction(async (c) => {
      await c.query("SELECT qa.require_permission($1,'cases.write')", [projectId]);
      const r = await c.query(
        "DELETE FROM qa.requirements WHERE id=$1 AND project_id=$2 AND version=$3",
        [id, projectId, version],
      );
      if (!r.rowCount)
        throw new HttpError(
          409,
          "REQUIREMENT_CONFLICT",
          "El requisito cambió o ya no existe. Actualiza la lista.",
        );
    });
  }
  async linkCaseBug(projectId: string, requirementId: string, caseId: string, bugId: string) {
    return this.transaction(async (c) => {
      await c.query("SELECT qa.require_permission($1,'cases.write')", [projectId]);
      const linked = await c.query(
        "SELECT 1 FROM qa.requirement_cases WHERE project_id=$1 AND requirement_id=$2 AND test_case_id=$3 FOR KEY SHARE",
        [projectId, requirementId, caseId],
      );
      if (!linked.rowCount)
        throw new HttpError(400, "INVALID_REFERENCE", "Selecciona un caso vinculado al requisito.");
      await c.query(
        "INSERT INTO qa.bug_test_cases(project_id,test_case_id,bug_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [projectId, caseId, bugId],
      );
    });
  }
  async coverage(
    projectId: string,
    limit: number,
    offset: number,
    requirementId?: string,
  ): Promise<CoveragePage> {
    return this.transaction(async (c) => {
      const base = `FROM qa.requirements r LEFT JOIN qa.requirement_cases rc ON rc.requirement_id=r.id LEFT JOIN qa.test_cases tc ON tc.id=rc.test_case_id LEFT JOIN qa.bug_test_cases bc ON bc.test_case_id=tc.id LEFT JOIN qa.bugs b ON b.id=bc.bug_id WHERE r.project_id=$1 AND ($2::bigint IS NULL OR r.id=$2)`;
      const count = await c.query<{ total: number }>(`SELECT count(*)::int AS total ${base}`, [
        projectId,
        requirementId ?? null,
      ]);
      const r = await c.query<{
        requirement_id: string;
        code: string;
        title: string;
        case_id: string | null;
        case_title: string | null;
        bug_id: string | null;
        bug_title: string | null;
      }>(
        `SELECT r.id::text AS requirement_id,r.code,r.title,tc.id::text AS case_id,tc.title AS case_title,b.id::text AS bug_id,b.title AS bug_title ${base} ORDER BY r.id,tc.id,b.id LIMIT $3 OFFSET $4`,
        [projectId, requirementId ?? null, limit, offset],
      );
      return {
        rows: r.rows.map((x): CoverageRow => ({
          requirementId: resourceId("REQ", x.requirement_id),
          code: x.code,
          title: x.title,
          caseId: x.case_id ? resourceId("TC", x.case_id) : null,
          caseTitle: x.case_title,
          bugId: x.bug_id ? resourceId("BUG", x.bug_id) : null,
          bugTitle: x.bug_title,
        })),
        total: count.rows[0].total,
        limit,
        offset,
      };
    }, true);
  }
  async runReport(projectId: string, id: string): Promise<RunReport> {
    return this.transaction(async (c) => {
      const r = await c.query<{
        title: string;
        owner: string;
        status: string;
        created_at: Date;
        name: string;
      }>(
        "SELECT r.title,r.owner,r.status,r.created_at,p.name FROM qa.test_runs r JOIN qa.projects p ON p.id=r.project_id WHERE r.id=$1 AND r.project_id=$2",
        [id, projectId],
      );
      const run = r.rows[0];
      if (!run) throw new HttpError(404, "RUN_NOT_FOUND", "Ejecución no disponible.");
      const results = await c.query<RunReport["results"][number]>(
        `SELECT 'RES-'||lpad(rr.id::text,greatest(3,length(rr.id::text)),'0') AS id,'TC-'||lpad(rr.test_case_id::text,greatest(3,length(rr.test_case_id::text)),'0') AS "caseId",COALESCE(rr.title_snapshot,tc.title) AS title,COALESCE(rr.case_version,1) AS "caseVersion",rr.status,rr.notes,rr.executed_at AS "executedAt",COALESCE((SELECT json_agg(json_build_object('action',s->>'action','expectedResult',COALESCE(s->>'expectedResult',s->>'expected_result',''))) FROM jsonb_array_elements(rr.steps_snapshot) s),'[]'::json) AS steps,
 COALESCE((SELECT array_agg('BUG-'||lpad(b.id::text,greatest(3,length(b.id::text)),'0') ORDER BY b.id) FROM qa.bugs b WHERE b.source_result_id=rr.id),ARRAY[]::text[]) AS "bugIds",
 COALESCE((SELECT json_agg(json_build_object('id','EVD-'||lpad(e.id::text,greatest(3,length(e.id::text)),'0'),'name',e.name) ORDER BY e.id) FROM qa.evidence e WHERE e.project_id=rr.project_id AND EXISTS(SELECT 1 FROM qa.evidence_links l WHERE l.evidence_id=e.id AND (l.test_run_result_id=rr.id OR l.test_run_id=rr.test_run_id))),'[]'::json) AS evidence
 FROM qa.test_run_results rr JOIN qa.test_cases tc ON tc.id=rr.test_case_id WHERE rr.test_run_id=$1 AND rr.project_id=$2 ORDER BY rr.id`,
        [id, projectId],
      );
      const summary = {
        total: results.rows.length,
        recorded: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        approvalRate: null as number | null,
      };
      const normalized = results.rows.map((row) => ({
        ...row,
        executedAt: row.executedAt ? new Date(row.executedAt).toISOString() : null,
      }));
      for (const row of normalized) {
        if (!row.executedAt) continue;
        summary.recorded++;
        if (row.status === "passed") summary.passed++;
        else if (row.status === "failed") summary.failed++;
        else if (row.status === "blocked") summary.blocked++;
        else summary.skipped++;
      }
      const evaluated = summary.passed + summary.failed + summary.blocked;
      if (evaluated) summary.approvalRate = Math.round((summary.passed / evaluated) * 100);
      return {
        projectName: run.name,
        generatedAt: new Date().toISOString(),
        runId: resourceId("RUN", id),
        title: run.title,
        owner: run.owner,
        status: run.status,
        createdAt: run.created_at.toISOString(),
        summary,
        results: normalized,
      };
    }, true);
  }
  async importTags(
    projectId: string,
    rows: { name: string; color: string }[],
    context: CreationContext,
  ) {
    return this.transaction(async (c) => {
      await c.query("SELECT qa.require_permission($1,'tags.write')", [projectId]);
      const hash = creationHash(rows);
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        `${context.actorId}:${projectId}:tags:${context.key}`,
      ]);
      const previous = await c.query<{
        request_hash: string;
        result: { created: number; existing: number };
      }>(
        "SELECT request_hash,result FROM qa.import_batches WHERE project_id=$1 AND actor_id=$2 AND request_key=$3",
        [projectId, context.actorId, context.key],
      );
      if (previous.rows[0]) {
        if (previous.rows[0].request_hash !== hash)
          throw new HttpError(
            409,
            "REQUEST_KEY_CONFLICT",
            "La importación ya se utilizó con otros datos.",
          );
        return previous.rows[0].result;
      }
      let created = 0,
        existing = 0;
      for (const row of rows) {
        const found = await c.query<{ color: string }>(
          "SELECT color FROM qa.tags WHERE project_id=$1 AND lower(name)=lower($2)",
          [projectId, row.name],
        );
        if (found.rows[0]) {
          if (found.rows[0].color.toLowerCase() !== row.color.toLowerCase())
            throw new HttpError(
              409,
              "TAG_COLOR_CONFLICT",
              `El tag ${row.name} ya existe con otro color. Revisa el archivo.`,
            );
          existing++;
          continue;
        }
        await c.query("INSERT INTO qa.tags(project_id,name,color) VALUES($1,$2,$3)", [
          projectId,
          row.name,
          row.color,
        ]);
        created++;
      }
      const result = { created, existing };
      await c.query(
        "INSERT INTO qa.import_batches(project_id,actor_id,request_key,request_hash,result) VALUES($1,$2,$3,$4,$5)",
        [projectId, context.actorId, context.key, hash, JSON.stringify(result)],
      );
      return result;
    });
  }
}
