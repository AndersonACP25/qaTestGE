import { createHash, randomBytes } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import type { Project } from "../repositories/repository.js";
import type {
  AuthGrant,
  AuthProvider,
  AuthState,
  BugTemplate,
  BugTemplateInput,
  BugTemplatePriority,
  UpdateProfileInput,
  User,
} from "../models/user.model.js";
import { HttpError } from "../http-error.js";
import { hashPassword, verifyPassword } from "./passwords.js";

export type { AuthGrant, AuthProvider, AuthState, User } from "../models/user.model.js";
export function sessionHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export function newSession() {
  return {
    token: randomBytes(32).toString("hex"),
    csrfToken: randomBytes(32).toString("hex"),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

interface BugTemplateRow extends QueryResultRow {
  id: string;
  name: string;
  title: string;
  description: string;
  priority: BugTemplatePriority;
  createdAt: Date;
}
const bugTemplate = (row: BugTemplateRow): BugTemplate => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
});

export class PostgresAuth implements AuthProvider {
  constructor(private readonly pool: Pool) {}
  async register(
    input: { name: string; email: string; password: string },
    previousToken?: string,
  ): Promise<AuthGrant> {
    const passwordHash = await hashPassword(input.password);
    const grant = newSession();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<User>(
        "INSERT INTO qa.users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id::text,name,email",
        [input.name.trim(), input.email.trim().toLowerCase(), passwordHash],
      );
      const user = rows[0];
      const org = await client.query("INSERT INTO qa.organizations(name) VALUES($1) RETURNING id", [
        `${user.name} · Workspace`.slice(0, 100),
      ]);
      await client.query(
        "INSERT INTO qa.organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",
        [org.rows[0].id, user.id],
      );
      await client.query("INSERT INTO qa.projects(organization_id,name) VALUES($1,'Mi proyecto')", [
        org.rows[0].id,
      ]);
      await this.saveSession(client, user.id, grant, previousToken);
      await client.query("COMMIT");
      return { user, ...grant };
    } catch (error) {
      await client.query("ROLLBACK");
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505")
        throw new HttpError(409, "ACCOUNT_EXISTS", "Ya existe una cuenta con ese correo.");
      throw error;
    } finally {
      client.release();
    }
  }
  async login(email: string, password: string, previousToken?: string): Promise<AuthGrant> {
    const { rows } = await this.pool.query<User & { password_hash: string; is_active: boolean }>(
      "SELECT id::text,name,email,password_hash,is_active FROM qa.users WHERE email=$1",
      [email.trim().toLowerCase()],
    );
    const user = rows[0];
    const valid = await verifyPassword(password, user?.password_hash);
    if (!valid || !user?.is_active)
      throw new HttpError(401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos.");
    const grant = newSession();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await this.saveSession(client, user.id, grant, previousToken);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return { user: { id: user.id, name: user.name, email: user.email }, ...grant };
  }
  async authenticate(token: string): Promise<AuthState | null> {
    const { rows } = await this.pool.query<User & { csrf_token: string }>(
      `SELECT u.id::text,u.name,u.email,s.csrf_token FROM qa.auth_sessions s
      JOIN qa.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.is_active`,
      [sessionHash(token)],
    );
    const user = rows[0];
    return user
      ? { user: { id: user.id, name: user.name, email: user.email }, csrfToken: user.csrf_token }
      : null;
  }
  async logout(token: string) {
    await this.pool.query("DELETE FROM qa.auth_sessions WHERE token_hash=$1", [sessionHash(token)]);
  }
  async projects(userId: string): Promise<Project[]> {
    const { rows } = await this.pool.query<Project>(
      `SELECT p.id::text,p.organization_id::text AS "organizationId",p.name,p.description
      FROM qa.projects p JOIN qa.organization_members m ON m.organization_id=p.organization_id WHERE m.user_id=$1 ORDER BY p.id`,
      [userId],
    );
    return rows;
  }
  async listTeams(userId: string) {
    const { rows } = await this.pool.query<{ id: string; name: string; role: "owner" | "member" }>(
      `SELECT o.id::text,o.name,m.role FROM qa.organizations o JOIN qa.organization_members m
       ON m.organization_id=o.id WHERE m.user_id=$1 ORDER BY o.id`,
      [userId],
    );
    return rows;
  }
  async createTeam(userId: string, name: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ id: string; name: string }>(
        "INSERT INTO qa.organizations(name) VALUES($1) RETURNING id::text,name",
        [name.trim()],
      );
      await client.query(
        "INSERT INTO qa.organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",
        [result.rows[0].id, userId],
      );
      await client.query("COMMIT");
      return { ...result.rows[0], role: "owner" as const };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async updateTeam(userId: string, teamId: string, name: string) {
    const result = await this.pool.query(
      `UPDATE qa.organizations o SET name=$3 WHERE o.id=$2 AND EXISTS
      (SELECT 1 FROM qa.organization_members m WHERE m.organization_id=o.id AND m.user_id=$1 AND m.role='owner')`,
      [userId, teamId, name.trim()],
    );
    if (!result.rowCount)
      throw new HttpError(404, "TEAM_NOT_FOUND", "Equipo no disponible para esta cuenta.");
  }
  async deleteTeam(userId: string, teamId: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const team = await client.query(
        `SELECT o.id FROM qa.organizations o WHERE o.id=$2 AND EXISTS
        (SELECT 1 FROM qa.organization_members m WHERE m.organization_id=o.id AND m.user_id=$1 AND m.role='owner') FOR UPDATE`,
        [userId, teamId],
      );
      if (!team.rowCount)
        throw new HttpError(404, "TEAM_NOT_FOUND", "Equipo no disponible para esta cuenta.");
      const dependencies = await client.query(
        `SELECT 1 FROM qa.projects WHERE organization_id=$1 UNION ALL
        SELECT 1 FROM qa.organization_members WHERE organization_id=$1 AND user_id<>$2 LIMIT 1`,
        [teamId, userId],
      );
      if (dependencies.rowCount)
        throw new HttpError(
          409,
          "TEAM_IN_USE",
          "El equipo tiene proyectos u otros integrantes; no se puede eliminar.",
        );
      await client.query("DELETE FROM qa.team_invitations WHERE organization_id=$1", [teamId]);
      await client.query(
        "DELETE FROM qa.organization_members WHERE organization_id=$1 AND user_id=$2 AND role='owner'",
        [teamId, userId],
      );
      await client.query("DELETE FROM qa.organizations WHERE id=$1", [teamId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async listTeamMembers(userId: string, teamId: string) {
    const { rows } = await this.pool.query<{ id: string; name: string; role: "owner" | "member" }>(
      `SELECT u.id::text,u.name,m.role FROM qa.organization_members m JOIN qa.users u ON u.id=m.user_id
       WHERE m.organization_id=$2 AND u.is_active AND EXISTS
       (SELECT 1 FROM qa.organization_members requester WHERE requester.organization_id=$2 AND requester.user_id=$1)
       ORDER BY lower(u.name),u.id`,
      [userId, teamId],
    );
    if (!rows.some((member) => member.id === userId))
      throw new HttpError(404, "TEAM_NOT_FOUND", "Equipo no disponible para esta cuenta.");
    return rows;
  }
  async createTeamInvite(userId: string, teamId: string) {
    const code = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await this.pool.query(
      `INSERT INTO qa.team_invitations(token_hash,organization_id,created_by,expires_at)
       SELECT $3,m.organization_id,$1,$4 FROM qa.organization_members m
       WHERE m.user_id=$1 AND m.organization_id=$2 AND m.role='owner'`,
      [userId, teamId, sessionHash(code), expiresAt],
    );
    if (!result.rowCount)
      throw new HttpError(404, "TEAM_NOT_FOUND", "Equipo no disponible para esta cuenta.");
    return { code, expiresAt: expiresAt.toISOString() };
  }
  async acceptTeamInvite(userId: string, code: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const invitation = await client.query<{ organization_id: string }>(
        `SELECT i.organization_id::text FROM qa.team_invitations i
         JOIN qa.users creator ON creator.id=i.created_by AND creator.is_active
         JOIN qa.organization_members owner ON owner.organization_id=i.organization_id AND owner.user_id=i.created_by AND owner.role='owner'
         WHERE i.token_hash=$1 AND i.expires_at>now() FOR UPDATE OF i`,
        [sessionHash(code)],
      );
      if (!invitation.rows[0])
        throw new HttpError(404, "INVITE_NOT_FOUND", "La invitación no es válida o ha expirado.");
      await client.query(
        `INSERT INTO qa.organization_members(organization_id,user_id,role) VALUES($1,$2,'member')
         ON CONFLICT (organization_id,user_id) DO NOTHING`,
        [invitation.rows[0].organization_id, userId],
      );
      await client.query("DELETE FROM qa.team_invitations WHERE token_hash=$1", [
        sessionHash(code),
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async removeTeamMember(userId: string, teamId: string, memberId: string) {
    const result = await this.pool.query(
      `DELETE FROM qa.organization_members target WHERE target.organization_id=$2 AND target.user_id=$3 AND target.role='member'
       AND EXISTS (SELECT 1 FROM qa.organization_members owner WHERE owner.organization_id=$2 AND owner.user_id=$1 AND owner.role='owner')`,
      [userId, teamId, memberId],
    );
    if (!result.rowCount)
      throw new HttpError(404, "MEMBER_NOT_FOUND", "Integrante no disponible para esta cuenta.");
  }
  async createProject(
    userId: string,
    name: string,
    description: string,
    teamId?: string,
  ): Promise<Project> {
    const { rows } = await this.pool.query<Project>(
      `INSERT INTO qa.projects(organization_id,name,description)
       SELECT m.organization_id,$2,$3 FROM qa.organization_members m
       WHERE m.user_id=$1 AND m.role='owner' AND ($4::bigint IS NULL OR m.organization_id=$4::bigint) ORDER BY m.organization_id LIMIT 1
       RETURNING id::text,organization_id::text AS "organizationId",name,description`,
      [userId, name.trim(), description.trim(), teamId ?? null],
    );
    if (!rows[0])
      throw new HttpError(
        403,
        "WORKSPACE_REQUIRED",
        "No tienes un espacio propio para crear proyectos.",
      );
    return rows[0];
  }
  async updateProject(
    userId: string,
    projectId: string,
    name: string,
    description: string,
  ): Promise<Project> {
    const { rows } = await this.pool.query<Project>(
      `UPDATE qa.projects p SET name=$3,description=$4 WHERE p.id=$2 AND EXISTS
       (SELECT 1 FROM qa.organization_members m WHERE m.organization_id=p.organization_id AND m.user_id=$1 AND m.role='owner')
       RETURNING p.id::text,p.organization_id::text AS "organizationId",p.name,p.description`,
      [userId, projectId, name.trim(), description.trim()],
    );
    if (!rows[0])
      throw new HttpError(404, "PROJECT_NOT_FOUND", "Proyecto no disponible para esta cuenta.");
    return rows[0];
  }
  async deleteProject(userId: string, projectId: string): Promise<void> {
    try {
      const { rowCount } = await this.pool.query(
        `DELETE FROM qa.projects p WHERE p.id=$2 AND EXISTS
         (SELECT 1 FROM qa.organization_members m WHERE m.organization_id=p.organization_id AND m.user_id=$1 AND m.role='owner')`,
        [userId, projectId],
      );
      if (!rowCount)
        throw new HttpError(404, "PROJECT_NOT_FOUND", "Proyecto no disponible para esta cuenta.");
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23503")
        throw new HttpError(
          409,
          "PROJECT_IN_USE",
          "El proyecto tiene registros vinculados y no se puede eliminar.",
        );
      throw error;
    }
  }
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    try {
      const { rows } = await this.pool.query<User>(
        "UPDATE qa.users SET name=$2,email=$3 WHERE id=$1 AND is_active RETURNING id::text,name,email",
        [userId, input.name.trim(), input.email.trim().toLowerCase()],
      );
      if (!rows[0]) throw new HttpError(401, "UNAUTHENTICATED", "La cuenta ya no está activa.");
      return rows[0];
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new HttpError(409, "ACCOUNT_EXISTS", "Ya existe una cuenta con ese correo.");
      }
      throw error;
    }
  }
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentToken: string,
  ): Promise<void> {
    const { rows } = await this.pool.query<{ password_hash: string }>(
      "SELECT password_hash FROM qa.users WHERE id=$1 AND is_active",
      [userId],
    );
    if (!(await verifyPassword(currentPassword, rows[0]?.password_hash))) {
      throw new HttpError(401, "INVALID_PASSWORD", "La contraseña actual no es correcta.");
    }
    const passwordHash = await hashPassword(newPassword);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const updated = await client.query(
        "UPDATE qa.users SET password_hash=$2 WHERE id=$1 AND is_active",
        [userId, passwordHash],
      );
      if (!updated.rowCount)
        throw new HttpError(401, "UNAUTHENTICATED", "La cuenta ya no está activa.");
      await client.query("DELETE FROM qa.auth_sessions WHERE user_id=$1 AND token_hash<>$2", [
        userId,
        sessionHash(currentToken),
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async listBugTemplates(userId: string): Promise<BugTemplate[]> {
    const { rows } = await this.pool.query<BugTemplateRow>(
      `SELECT id::text, name, title, description, priority,
      created_at AS "createdAt" FROM qa.bug_templates WHERE user_id=$1 ORDER BY id`,
      [userId],
    );
    return rows.map(bugTemplate);
  }
  async createBugTemplate(userId: string, input: BugTemplateInput): Promise<BugTemplate> {
    const { rows } = await this.pool.query<BugTemplateRow>(
      `INSERT INTO qa.bug_templates(user_id,name,title,description,priority)
      VALUES($1,$2,$3,$4,$5) RETURNING id::text,name,title,description,priority,created_at AS "createdAt"`,
      [userId, input.name.trim(), input.title.trim(), input.description, input.priority],
    );
    return bugTemplate(rows[0]);
  }
  async updateBugTemplate(
    userId: string,
    templateId: string,
    input: BugTemplateInput,
  ): Promise<BugTemplate> {
    const { rows } = await this.pool.query<BugTemplateRow>(
      `UPDATE qa.bug_templates SET name=$3,title=$4,description=$5,priority=$6
      WHERE user_id=$1 AND id=$2 RETURNING id::text,name,title,description,priority,created_at AS "createdAt"`,
      [
        userId,
        templateId,
        input.name.trim(),
        input.title.trim(),
        input.description,
        input.priority,
      ],
    );
    if (!rows[0]) throw new HttpError(404, "TEMPLATE_NOT_FOUND", "La plantilla no existe.");
    return bugTemplate(rows[0]);
  }
  async deleteBugTemplate(userId: string, templateId: string): Promise<void> {
    const result = await this.pool.query(
      "DELETE FROM qa.bug_templates WHERE user_id=$1 AND id=$2",
      [userId, templateId],
    );
    if (!result.rowCount) throw new HttpError(404, "TEMPLATE_NOT_FOUND", "La plantilla no existe.");
  }
  async deactivateAccount(userId: string, currentPassword: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{ password_hash: string }>(
        "SELECT password_hash FROM qa.users WHERE id=$1 AND is_active FOR UPDATE",
        [userId],
      );
      if (!(await verifyPassword(currentPassword, rows[0]?.password_hash))) {
        throw new HttpError(401, "INVALID_PASSWORD", "La contraseña actual no es correcta.");
      }
      const replacementHash = await hashPassword(randomBytes(32).toString("hex"));
      const updated = await client.query(
        `UPDATE qa.users SET name='Cuenta eliminada',
        email='deleted+' || id::text || '@invalid.local', password_hash=$2, is_active=false
        WHERE id=$1 AND is_active`,
        [userId, replacementHash],
      );
      if (!updated.rowCount)
        throw new HttpError(401, "UNAUTHENTICATED", "La cuenta ya no está activa.");
      await client.query("DELETE FROM qa.auth_sessions WHERE user_id=$1", [userId]);
      await client.query("DELETE FROM qa.bug_templates WHERE user_id=$1", [userId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  private async saveSession(
    client: PoolClient,
    userId: string,
    grant: ReturnType<typeof newSession>,
    previousToken?: string,
  ) {
    if (previousToken)
      await client.query("DELETE FROM qa.auth_sessions WHERE token_hash=$1", [
        sessionHash(previousToken),
      ]);
    await client.query(
      "INSERT INTO qa.auth_sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,$4)",
      [sessionHash(grant.token), userId, grant.csrfToken, grant.expiresAt],
    );
  }
}
