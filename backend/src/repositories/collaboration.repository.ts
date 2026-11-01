import { PostgresProjectAdministration } from "./project-administration.repository.js";
import type { AuditFilters, AuditSettings, ProvisionUserInput } from "../models/audit.model.js";
import { resolvePlainMentions } from "../models/plain-mentions.js";
import { createHash } from "node:crypto";
import type { DatabasePool, DatabaseClient } from "../auth/actor-database.js";
import type {
  Activity,
  CollaborationRepository,
  Comment,
  ProjectMember,
  ProjectRole,
  ResourceTarget,
  MentionNotification,
} from "../models/collaboration.model.js";
import { HttpError } from "../http-error.js";
import { parseReference, resourceId } from "../validation.js";
const columns = { bug: "bug_id", case: "test_case_id", run: "test_run_id" } as const;
const tables = { bug: "bugs", case: "test_cases", run: "test_runs" } as const;
const prefixes = { bug: "BUG", case: "TC", run: "RUN" } as const;
export function mentionIds(body: string): string[] {
  const ids = [...body.matchAll(/@\[([^\]\r\n]{1,100})\]\(user:([1-9]\d{0,18})\)/g)].map(
    (m) => m[2],
  );
  const unique = [...new Set(ids)];
  if (unique.length > 20 || unique.some((id) => BigInt(id) > 9223372036854775807n))
    throw new HttpError(400, "INVALID_MENTIONS", "Máximo 20 menciones válidas por comentario.");
  return unique;
}
const commentSql = `SELECT c.id::text,c.project_id::text,c.author_id::text,u.name AS author_name,c.body,c.version,c.created_at,c.edited_at,c.deleted_at,
 c.bug_id::text,c.test_case_id::text,c.test_run_id::text,
 COALESCE((SELECT json_agg(json_build_object('id',m.user_id::text,'name',mu.name) ORDER BY m.user_id) FROM qa.comment_mentions m JOIN qa.users mu ON mu.id=m.user_id WHERE m.comment_id=c.id),'[]'::json) AS mentions
 FROM qa.comments c JOIN qa.users u ON u.id=c.author_id`;
interface CommentRow {
  id: string;
  project_id: string;
  author_id: string;
  author_name: string;
  body: string;
  version: number;
  created_at: Date;
  edited_at: Date | null;
  deleted_at: Date | null;
  bug_id: string | null;
  test_case_id: string | null;
  test_run_id: string | null;
  mentions: { id: string; name: string }[];
}
const toComment = (r: CommentRow): Comment => ({
  id: resourceId("CMT", r.id),
  projectId: r.project_id,
  target: r.bug_id
    ? { kind: "bug", id: resourceId("BUG", r.bug_id) }
    : r.test_case_id
      ? { kind: "case", id: resourceId("TC", r.test_case_id) }
      : { kind: "run", id: resourceId("RUN", r.test_run_id!) },
  authorId: r.author_id,
  authorName: r.author_name,
  body: r.body,
  version: r.version,
  createdAt: r.created_at.toISOString(),
  editedAt: r.edited_at?.toISOString() ?? null,
  deletedAt: r.deleted_at?.toISOString() ?? null,
  mentions: r.mentions,
});
export class PostgresCollaborationRepository implements CollaborationRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly actorId: string,
  ) {}
  auditSettings(projectId: string) {
    return new PostgresProjectAdministration(this.pool, this.actorId).settings(projectId);
  }
  saveAuditSettings(projectId: string, input: AuditSettings) {
    return new PostgresProjectAdministration(this.pool, this.actorId).saveSettings(
      projectId,
      input,
    );
  }
  createProjectUser(projectId: string, input: ProvisionUserInput, key: string) {
    return new PostgresProjectAdministration(this.pool, this.actorId).createUser(
      projectId,
      input,
      key,
    );
  }
  async readAllNotifications(projectId: string) {
    const result = await this.pool.query<{ updated: number; read_at: Date }>(
      `WITH changed AS (UPDATE qa.mention_notifications n SET read_at=now() WHERE n.project_id=$1 AND n.user_id=$2 AND n.read_at IS NULL AND EXISTS(SELECT 1 FROM qa.comments c WHERE c.id=n.comment_id AND c.project_id=n.project_id AND c.deleted_at IS NULL) RETURNING id) SELECT count(*)::int AS updated, now() AS read_at FROM changed`,
      [projectId, this.actorId],
    );
    return { updated: result.rows[0].updated, readAt: result.rows[0].read_at.toISOString() };
  }
  private async transaction<T>(work: (client: DatabaseClient) => Promise<T>) {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const value = await work(c);
      await c.query("COMMIT");
      return value;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  private async target(c: DatabaseClient, p: string, target: ResourceTarget) {
    const id = parseReference(target.id, prefixes[target.kind]);
    if (!id) throw new HttpError(400, "INVALID_TARGET", "Registro inválido.");
    const found = await c.query(
      `SELECT id FROM qa.${tables[target.kind]} WHERE id=$1 AND project_id=$2 FOR KEY SHARE`,
      [id, p],
    );
    if (!found.rowCount)
      throw new HttpError(404, "TARGET_NOT_FOUND", "Registro no disponible en este proyecto.");
    return id;
  }
  async members(projectId: string, includeCandidates = false): Promise<ProjectMember[]> {
    if (includeCandidates)
      await this.pool.query("SELECT qa.require_permission($1,'access.manage')", [projectId]);
    const r = await this.pool.query<ProjectMember>(
      `SELECT u.id::text,u.name,qa.project_role(p.id,u.id) AS role,m.role='owner' AS owner,COALESCE(pm.revision,0) AS revision FROM qa.projects p JOIN qa.organization_members m ON m.organization_id=p.organization_id JOIN qa.users u ON u.id=m.user_id AND u.is_active LEFT JOIN qa.project_members pm ON pm.project_id=p.id AND pm.user_id=u.id WHERE p.id=$1 AND ($2::boolean OR qa.project_role(p.id,u.id) IS NOT NULL) ORDER BY lower(u.name),u.id`,
      [projectId, includeCandidates],
    );
    return r.rows;
  }
  async saveMember(
    projectId: string,
    userId: string,
    role: ProjectRole | null,
    revision: number,
  ): Promise<void> {
    await this.transaction(async (c) => {
      await c.query("SELECT id FROM qa.projects WHERE id=$1 FOR UPDATE", [projectId]);
      await c.query("SELECT qa.require_permission($1,'access.manage')", [projectId]);
      const member = await c.query<{ organization_id: string; owner: boolean; revision: number }>(
        `SELECT p.organization_id::text,m.role='owner' AS owner,COALESCE(pm.revision,0) AS revision FROM qa.projects p JOIN qa.organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2 JOIN qa.users u ON u.id=m.user_id AND u.is_active LEFT JOIN qa.project_members pm ON pm.project_id=p.id AND pm.user_id=m.user_id WHERE p.id=$1`,
        [projectId, userId],
      );
      const current = member.rows[0];
      if (!current)
        throw new HttpError(404, "MEMBER_NOT_FOUND", "Selecciona un integrante activo del equipo.");
      if (current.owner)
        throw new HttpError(
          409,
          "OWNER_PROTECTED",
          "El propietario mantiene su acceso administrativo.",
        );
      if (current.revision !== revision)
        throw new HttpError(409, "ACCESS_CONFLICT", "El acceso cambió. Actualiza la lista.");
      if (role !== "Admin") {
        const admins = await c.query(
          "SELECT 1 FROM qa.organization_members m JOIN qa.projects p ON p.organization_id=m.organization_id JOIN qa.users u ON u.id=m.user_id AND u.is_active WHERE p.id=$1 AND m.user_id<>$2 AND qa.project_role(p.id,m.user_id)='Admin' LIMIT 1",
          [projectId, userId],
        );
        if (!admins.rowCount)
          throw new HttpError(
            409,
            "LAST_ADMIN",
            "Conserva al menos un Admin activo en el proyecto.",
          );
      }
      if (role === null) {
        const assigned = await c.query(
          "SELECT 1 FROM qa.bugs WHERE project_id=$1 AND assignee_user_id=$2 UNION ALL SELECT 1 FROM qa.test_cases WHERE project_id=$1 AND assignee_user_id=$2 LIMIT 1",
          [projectId, userId],
        );
        if (assigned.rowCount)
          throw new HttpError(
            409,
            "MEMBER_ASSIGNED",
            "Reasigna sus bugs y casos antes de retirar el acceso.",
          );
        await c.query(
          "UPDATE qa.project_members SET role=NULL,revision=revision+1 WHERE project_id=$1 AND user_id=$2",
          [projectId, userId],
        );
      } else
        await c.query(
          "INSERT INTO qa.project_members(project_id,organization_id,user_id,role) VALUES($1,$2,$3,$4) ON CONFLICT(project_id,user_id) DO UPDATE SET role=EXCLUDED.role,revision=qa.project_members.revision+1",
          [projectId, current.organization_id, userId, role],
        );
    });
  }
  async comments(projectId: string, target: ResourceTarget): Promise<Comment[]> {
    return this.transaction(async (c) => {
      const id = await this.target(c, projectId, target);
      const r = await c.query<CommentRow>(
        `${commentSql} WHERE c.project_id=$1 AND c.${columns[target.kind]}=$2 ORDER BY c.id DESC LIMIT 100`,
        [projectId, id],
      );
      return r.rows.map(toComment);
    });
  }
  private async resolveBody(c: DatabaseClient, projectId: string, body: string) {
    const members = await c.query<{ id: string; name: string }>(
      `SELECT u.id::text,u.name FROM qa.projects p JOIN qa.organization_members m ON m.organization_id=p.organization_id JOIN qa.users u ON u.id=m.user_id AND u.is_active WHERE p.id=$1 AND qa.project_role(p.id,u.id) IS NOT NULL`,
      [projectId],
    );
    return resolvePlainMentions(body, members.rows);
  }
  private async mentions(c: DatabaseClient, projectId: string, commentId: string, body: string) {
    const ids = mentionIds(body);
    for (const id of ids) {
      const result = await c.query("SELECT qa.project_role($1,$2) AS role", [projectId, id]);
      if (!result.rows[0]?.role)
        throw new HttpError(
          400,
          "INVALID_MENTION",
          "Solo puedes mencionar integrantes activos con acceso al proyecto.",
        );
    }
    await c.query("DELETE FROM qa.comment_mentions WHERE comment_id=$1 AND project_id=$2", [
      commentId,
      projectId,
    ]);
    for (const id of ids) {
      await c.query(
        "INSERT INTO qa.comment_mentions(project_id,comment_id,user_id) VALUES($1,$2,$3)",
        [projectId, commentId, id],
      );
      await c.query(
        "INSERT INTO qa.mention_notifications(project_id,comment_id,user_id) VALUES($1,$2,$3) ON CONFLICT(comment_id,user_id) DO NOTHING",
        [projectId, commentId, id],
      );
    }
    await c.query(
      "DELETE FROM qa.mention_notifications WHERE comment_id=$1 AND project_id=$2 AND NOT(user_id=ANY($3::bigint[]))",
      [commentId, projectId, ids],
    );
  }
  async createComment(
    projectId: string,
    target: ResourceTarget,
    body: string,
    key: string,
  ): Promise<Comment> {
    return this.transaction(async (c) => {
      await c.query("SELECT qa.require_permission($1,'comments.write')", [projectId]);
      const id = await this.target(c, projectId, target);
      const hash = createHash("sha256").update(JSON.stringify({ target, body })).digest("hex");
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        `${this.actorId}:${projectId}:comment:${key}`,
      ]);
      const prior = await c.query<{ id: string; request_hash: string }>(
        "SELECT id::text,request_hash FROM qa.comments WHERE project_id=$1 AND author_id=$2 AND request_key=$3",
        [projectId, this.actorId, key],
      );
      let commentId = prior.rows[0]?.id;
      if (commentId) {
        if (prior.rows[0].request_hash !== hash)
          throw new HttpError(
            409,
            "REQUEST_KEY_CONFLICT",
            "La solicitud ya se utilizó con otro contenido.",
          );
      } else {
        const resolved = await this.resolveBody(c, projectId, body);
        const r = await c.query<{ id: string }>(
          `INSERT INTO qa.comments(project_id,${columns[target.kind]},author_id,body,request_key,request_hash) VALUES($1,$2,$3,$4,$5,$6) RETURNING id::text`,
          [projectId, id, this.actorId, resolved, key, hash],
        );
        commentId = r.rows[0].id;
        await this.mentions(c, projectId, commentId, resolved);
      }
      const result = await c.query<CommentRow>(`${commentSql} WHERE c.id=$1 AND c.project_id=$2`, [
        commentId,
        projectId,
      ]);
      return toComment(result.rows[0]);
    });
  }
  async editComment(
    projectId: string,
    id: string,
    body: string,
    version: number,
    remove: boolean,
  ): Promise<Comment> {
    return this.transaction(async (c) => {
      await c.query("SELECT qa.require_permission($1,'comments.write')", [projectId]);
      const r = await c.query<CommentRow>(
        `${commentSql} WHERE c.id=$1 AND c.project_id=$2 FOR UPDATE OF c`,
        [id, projectId],
      );
      const previous = r.rows[0];
      if (!previous) throw new HttpError(404, "COMMENT_NOT_FOUND", "Comentario no disponible.");
      const role = await c.query("SELECT qa.project_role($1,$2) AS role", [
        projectId,
        this.actorId,
      ]);
      if (previous.author_id !== this.actorId && role.rows[0]?.role !== "Admin")
        throw new HttpError(
          403,
          "FORBIDDEN",
          "Solo el autor o un Admin puede modificar este comentario.",
        );
      if (previous.deleted_at || previous.version !== version)
        throw new HttpError(
          409,
          "COMMENT_CONFLICT",
          "El comentario cambió o fue eliminado. Actualiza la conversación.",
        );
      const resolved = remove ? "" : await this.resolveBody(c, projectId, body);
      await c.query(
        "UPDATE qa.comments SET body=$3,version=version+1,edited_at=now(),deleted_at=CASE WHEN $4 THEN now() ELSE NULL END WHERE id=$1 AND project_id=$2",
        [id, projectId, resolved, remove],
      );
      await this.mentions(c, projectId, id, resolved);
      const updated = await c.query<CommentRow>(`${commentSql} WHERE c.id=$1 AND c.project_id=$2`, [
        id,
        projectId,
      ]);
      return toComment(updated.rows[0]);
    });
  }
  async activity(
    projectId: string,
    target?: ResourceTarget,
    before?: string,
    filters?: AuditFilters,
  ): Promise<Activity[]> {
    const r = await this.pool.query<{
      id: string;
      project_id: string;
      resource_kind: string;
      resource_id: string;
      action: string;
      actor_id: string | null;
      actor_name: string;
      created_at: Date;
      before_data: unknown;
      after_data: unknown;
      request_id: string | null;
    }>(
      `SELECT a.*,a.id::text,a.project_id::text,a.actor_id::text,CASE WHEN a.actor_id IS NULL THEN 'Sistema' ELSE COALESCE(u.name,'Cuenta no disponible') END AS actor_name FROM qa.activity a LEFT JOIN qa.users u ON u.id=a.actor_id WHERE a.project_id=$1 AND ($2::text IS NULL OR (a.resource_kind=$2 AND a.resource_id=$3)) AND ($4::bigint IS NULL OR a.id<$4)
        AND ($5::text[] IS NULL OR a.resource_kind=ANY($5))
        AND ($6::text IS NULL OR a.resource_kind=$6)
        AND ($7::text IS NULL OR split_part(a.action,'.',2)=$7)
        AND ($8::bigint IS NULL OR a.actor_id=$8)
        AND ($9::date IS NULL OR a.created_at >= ($9::date::timestamp AT TIME ZONE 'UTC'))
        AND ($10::date IS NULL OR a.created_at < (($10::date+1)::timestamp AT TIME ZONE 'UTC'))
        AND ($11::text IS NULL OR concat_ws(' ',u.name,a.resource_id,a.action) ILIKE '%' || $11 || '%')
        ORDER BY a.id DESC LIMIT $12`,
      [
        projectId,
        target?.kind ?? null,
        target
          ? resourceId(prefixes[target.kind], parseReference(target.id, prefixes[target.kind])!)
          : null,
        before ?? null,
        filters?.profile === "Calidad"
          ? ["bug", "case", "run", "plan", "evidence", "requirement", "tag"]
          : filters?.profile === "Seguridad"
            ? ["access", "user", "audit-config", "workflow"]
            : null,
        filters?.kind ?? null,
        filters?.operation ?? null,
        filters?.actorId ?? null,
        filters?.from ?? null,
        filters?.to ?? null,
        filters?.search || null,
        filters?.limit ?? 50,
      ],
    );
    return r.rows.map((x) => ({
      id: x.id,
      projectId: x.project_id,
      kind: x.resource_kind,
      resourceId: x.resource_id,
      action: x.action,
      actorId: x.actor_id,
      actorName: x.actor_name,
      createdAt: x.created_at.toISOString(),
      before: x.before_data,
      after: x.after_data,
      requestId: x.request_id,
    }));
  }
  async notifications(projectId: string): Promise<MentionNotification[]> {
    const r = await this.pool.query<{
      id: string;
      comment_id: string;
      bug_id: string | null;
      test_case_id: string | null;
      test_run_id: string | null;
      name: string;
      created_at: Date;
      read_at: Date | null;
    }>(
      `SELECT n.id::text,n.comment_id::text,c.bug_id::text,c.test_case_id::text,c.test_run_id::text,u.name,n.created_at,n.read_at FROM qa.mention_notifications n JOIN qa.comments c ON c.id=n.comment_id JOIN qa.users u ON u.id=c.author_id WHERE n.project_id=$1 AND n.user_id=$2 AND c.deleted_at IS NULL ORDER BY n.id DESC LIMIT 100`,
      [projectId, this.actorId],
    );
    return r.rows.map((x) => ({
      id: resourceId("NTF", x.id),
      commentId: resourceId("CMT", x.comment_id),
      target: x.bug_id
        ? { kind: "bug", id: resourceId("BUG", x.bug_id) }
        : x.test_case_id
          ? { kind: "case", id: resourceId("TC", x.test_case_id) }
          : { kind: "run", id: resourceId("RUN", x.test_run_id!) },
      authorName: x.name,
      createdAt: x.created_at.toISOString(),
      readAt: x.read_at?.toISOString() ?? null,
    }));
  }
  async readNotification(projectId: string, id: string) {
    const r = await this.pool.query(
      "UPDATE qa.mention_notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND project_id=$2 AND user_id=$3",
      [id, projectId, this.actorId],
    );
    if (!r.rowCount) throw new HttpError(404, "NOTIFICATION_NOT_FOUND", "Aviso no disponible.");
  }
}
