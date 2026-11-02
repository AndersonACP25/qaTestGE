import type { DatabasePool, DatabaseClient } from "../auth/actor-database.js";
import { hashPassword, verifyPassword } from "../auth/passwords.js";
import { HttpError } from "../http-error.js";
import { creationHash } from "./creation-request.js";
import {
  defaultAuditSettings,
  type AuditSettings,
  type ProvisionUserInput,
} from "../models/audit.model.js";
import type { ProjectMember } from "../models/collaboration.model.js";
export class PostgresProjectAdministration {
  constructor(
    private readonly pool: DatabasePool,
    private readonly actorId: string,
  ) {}
  private async transaction<T>(work: (client: DatabaseClient) => Promise<T>) {
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
  async settings(projectId: string): Promise<AuditSettings> {
    const result = await this.pool.query<AuditSettings>(
      'SELECT profile,detail,page_size AS "pageSize",version FROM qa.project_audit_settings WHERE project_id=$1',
      [projectId],
    );
    return result.rows[0] ?? { ...defaultAuditSettings };
  }
  async saveSettings(projectId: string, input: AuditSettings): Promise<AuditSettings> {
    return this.transaction(async (client) => {
      await client.query("SELECT id FROM qa.projects WHERE id=$1 FOR UPDATE", [projectId]);
      await client.query("SELECT qa.require_permission($1,'settings.manage')", [projectId]);
      const current = await client.query<{ version: number }>(
        "SELECT version FROM qa.project_audit_settings WHERE project_id=$1",
        [projectId],
      );
      if ((current.rows[0]?.version ?? 0) !== input.version)
        throw new HttpError(
          409,
          "AUDIT_SETTINGS_CONFLICT",
          "La configuración cambió. Actualiza antes de guardar.",
        );
      const saved = await client.query<AuditSettings>(
        'INSERT INTO qa.project_audit_settings(project_id,profile,detail,page_size) VALUES($1,$2,$3,$4) ON CONFLICT(project_id) DO UPDATE SET profile=EXCLUDED.profile,detail=EXCLUDED.detail,page_size=EXCLUDED.page_size,version=qa.project_audit_settings.version+1 RETURNING profile,detail,page_size AS "pageSize",version',
        [projectId, input.profile, input.detail, input.pageSize],
      );
      return saved.rows[0];
    });
  }
  async createUser(
    projectId: string,
    input: ProvisionUserInput,
    key: string,
  ): Promise<ProjectMember> {
    try {
      return await this.transaction(async (client) => {
        const project = await client.query<{ organization_id: string }>(
          "SELECT organization_id::text FROM qa.projects WHERE id=$1 FOR UPDATE",
          [projectId],
        );
        await client.query("SELECT qa.require_permission($1,'access.manage')", [projectId]);
        if (!project.rows[0])
          throw new HttpError(404, "PROJECT_NOT_FOUND", "Proyecto no disponible.");
        const fingerprint = creationHash({
          name: input.name,
          email: input.email,
          role: input.role,
        });
        const prior = await client.query<{
          request_hash: string;
          user_id: string;
          password_hash: string;
        }>(
          "SELECT r.request_hash,r.user_id::text,u.password_hash FROM qa.project_user_requests r JOIN qa.users u ON u.id=r.user_id WHERE r.project_id=$1 AND r.actor_id=$2 AND r.request_key=$3",
          [projectId, this.actorId, key],
        );
        let userId = prior.rows[0]?.user_id;
        if (userId) {
          if (
            prior.rows[0].request_hash !== fingerprint ||
            !(await verifyPassword(input.password, prior.rows[0].password_hash))
          )
            throw new HttpError(
              409,
              "REQUEST_KEY_CONFLICT",
              "El intento ya se utilizó con otros datos. Revisa el usuario creado.",
            );
        } else {
          const passwordHash = await hashPassword(input.password);
          const created = await client.query<{ id: string }>(
            "INSERT INTO qa.users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id::text",
            [input.name, input.email, passwordHash],
          );
          userId = created.rows[0].id;
          const organizationId = project.rows[0].organization_id;
          await client.query(
            "INSERT INTO qa.organization_members(organization_id,user_id,role) VALUES($1,$2,'member')",
            [organizationId, userId],
          );
          await client.query(
            "INSERT INTO qa.project_members(project_id,organization_id,user_id,role) VALUES($1,$2,$3,$4)",
            [projectId, organizationId, userId, input.role],
          );
          await client.query(
            "INSERT INTO qa.project_user_requests(project_id,actor_id,request_key,request_hash,user_id) VALUES($1,$2,$3,$4,$5)",
            [projectId, this.actorId, key, fingerprint, userId],
          );
          await client.query(
            "INSERT INTO qa.activity(project_id,resource_kind,resource_id,action,actor_id,request_id,after_data) VALUES($1,'user',$2,'users.provision',$3,NULLIF(current_setting('qa.request_id',true),''),$4::jsonb)",
            [
              projectId,
              userId,
              this.actorId,
              JSON.stringify({ name: input.name, role: input.role }),
            ],
          );
        }
        const member = await client.query<ProjectMember>(
          "SELECT u.id::text,u.name,pm.role,false AS owner,pm.revision FROM qa.users u JOIN qa.project_members pm ON pm.user_id=u.id WHERE pm.project_id=$1 AND u.id=$2",
          [projectId, userId],
        );
        if (!member.rows[0])
          throw new HttpError(
            409,
            "MEMBER_CHANGED",
            "El usuario creado cambió. Actualiza la lista.",
          );
        return member.rows[0];
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505")
        throw new HttpError(
          409,
          "USER_NOT_CREATED",
          "No se pudo crear la cuenta con esos datos. Si el usuario ya pertenece al equipo, agrégalo desde los existentes.",
        );
      throw error;
    }
  }
}
