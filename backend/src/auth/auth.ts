import { createHash, randomBytes } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { Project } from "../repositories/repository.js";
import { HttpError } from "../http-error.js";
import { hashPassword, verifyPassword } from "./passwords.js";

export interface User { id: string; name: string; email: string }
export interface AuthState { user: User; csrfToken: string }
export interface AuthGrant extends AuthState { token: string; expiresAt: Date }
export interface AuthProvider {
  register(input: { name: string; email: string; password: string }, previousToken?: string): Promise<AuthGrant>;
  login(email: string, password: string, previousToken?: string): Promise<AuthGrant>;
  authenticate(token: string): Promise<AuthState | null>;
  logout(token: string): Promise<void>;
  projects(userId: string): Promise<Project[]>;
}
export function sessionHash(token: string): string { return createHash("sha256").update(token).digest("hex"); }
export function newSession() {
  return { token: randomBytes(32).toString("hex"), csrfToken: randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
}

export class PostgresAuth implements AuthProvider {
  constructor(private readonly pool: Pool) {}
  async register(input: { name: string; email: string; password: string }, previousToken?: string): Promise<AuthGrant> {
    const passwordHash = await hashPassword(input.password);
    const grant = newSession();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<User>("INSERT INTO qa.users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id::text,name,email", [input.name.trim(), input.email.trim().toLowerCase(), passwordHash]);
      const user = rows[0];
      const org = await client.query("INSERT INTO qa.organizations(name) VALUES($1) RETURNING id", [`${user.name} · Workspace`.slice(0, 100)]);
      await client.query("INSERT INTO qa.organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')", [org.rows[0].id, user.id]);
      await client.query("INSERT INTO qa.projects(organization_id,name) VALUES($1,'Mi proyecto')", [org.rows[0].id]);
      await this.saveSession(client, user.id, grant, previousToken);
      await client.query("COMMIT");
      return { user, ...grant };
    } catch (error) {
      await client.query("ROLLBACK");
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") throw new HttpError(409, "ACCOUNT_EXISTS", "Ya existe una cuenta con ese correo.");
      throw error;
    } finally { client.release(); }
  }
  async login(email: string, password: string, previousToken?: string): Promise<AuthGrant> {
    const { rows } = await this.pool.query<User & { password_hash: string; is_active: boolean }>("SELECT id::text,name,email,password_hash,is_active FROM qa.users WHERE email=$1", [email.trim().toLowerCase()]);
    const user = rows[0];
    const valid = await verifyPassword(password, user?.password_hash);
    if (!valid || !user?.is_active) throw new HttpError(401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos.");
    const grant = newSession();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await this.saveSession(client, user.id, grant, previousToken);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
    return { user: { id: user.id, name: user.name, email: user.email }, ...grant };
  }
  async authenticate(token: string): Promise<AuthState | null> {
    const { rows } = await this.pool.query<User & { csrf_token: string }>(`SELECT u.id::text,u.name,u.email,s.csrf_token FROM qa.auth_sessions s
      JOIN qa.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.is_active`, [sessionHash(token)]);
    const user = rows[0];
    return user ? { user: { id: user.id, name: user.name, email: user.email }, csrfToken: user.csrf_token } : null;
  }
  async logout(token: string) { await this.pool.query("DELETE FROM qa.auth_sessions WHERE token_hash=$1", [sessionHash(token)]); }
  async projects(userId: string): Promise<Project[]> {
    const { rows } = await this.pool.query<Project>(`SELECT p.id::text,p.organization_id::text AS "organizationId",p.name,p.description
      FROM qa.projects p JOIN qa.organization_members m ON m.organization_id=p.organization_id WHERE m.user_id=$1 ORDER BY p.id`, [userId]);
    return rows;
  }
  private async saveSession(client: PoolClient, userId: string, grant: ReturnType<typeof newSession>, previousToken?: string) {
    if (previousToken) await client.query("DELETE FROM qa.auth_sessions WHERE token_hash=$1", [sessionHash(previousToken)]);
    await client.query("INSERT INTO qa.auth_sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,$4)", [sessionHash(grant.token), userId, grant.csrfToken, grant.expiresAt]);
  }
}
