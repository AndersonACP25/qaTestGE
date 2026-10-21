// Opt-in test: explicit isolated TEST_DATABASE_URL; never loads .env.
import assert from "node:assert/strict";
import request from "supertest";
import { createPool, checkDatabase } from "../src/database.js";
import { createApp } from "../src/app.js";
import { PostgresRepository } from "../src/repositories/postgres.repository.js";
import { PostgresAuth, sessionHash } from "../src/auth/auth.js";

if (!process.env.TEST_DATABASE_URL) throw new Error("Define TEST_DATABASE_URL para una base de pruebas aislada.");
const pool = createPool(process.env.TEST_DATABASE_URL);
const userIds: string[] = [];
const orgIds: string[] = [];
try {
  await checkDatabase(pool);
  const app = createApp(new PostgresRepository(pool), new PostgresAuth(pool));
  assert.equal((await request(app).get("/api/bugs")).status, 401);
  const first = request.agent(app);
  const second = request.agent(app);
  const password = "test-only long passphrase";
  for (const [agent, email] of [[first, "member-a@example.test"], [second, "member-b@example.test"]] as const) {
    const registered = await agent.post("/api/auth/register").send({ name: "Integración", email, password });
    assert.equal(registered.status, 201);
    assert.ok(!registered.text.includes(password));
    userIds.push(registered.body.data.user.id);
    agent.set("X-CSRF-Token", registered.body.data.csrfToken);
    const projects = await agent.get("/api/projects");
    assert.equal(projects.body.data.length, 1);
    orgIds.push(projects.body.data[0].organizationId);
  }
  const projectId = (await first.get("/api/projects")).body.data[0].id;
  const otherId = (await second.get("/api/projects")).body.data[0].id;
  assert.equal((await first.get(`/api/bugs?projectId=${otherId}`)).status, 404);
  assert.equal((await first.post("/api/bugs").send({ projectId: otherId, title: "Forbidden", priority: "Alta" })).status, 404);
  const bug = await first.post("/api/bugs").send({ projectId, title: "Bug de prueba", priority: "Alta" });
  assert.equal(bug.status, 201);
  const tc = await first.post("/api/test-cases").send({ projectId, title: "Caso", suite: "Smoke", steps: [{ action: "Enviar", expectedResult: "Validar" }] });
  assert.equal(tc.status, 201); assert.equal(tc.body.data.steps[0].expectedResult, "Validar");
  const run = await first.post("/api/test-runs").send({ projectId, title: "Run", owner: "QA", caseIds: [tc.body.data.id] });
  assert.equal(run.status, 201); assert.equal(run.body.data.caseCount, 1);
  const invalid = await second.post("/api/test-runs").send({ projectId: otherId, title: "Invalid", owner: "QA", caseIds: [tc.body.data.id] });
  assert.equal(invalid.status, 400);
  assert.equal((await second.get("/api/test-runs")).body.data.length, 0);
  const ev = await first.post("/api/evidence").send({ projectId, name: "test.png", type: "Imagen", sizeBytes: 10, related: bug.body.data.id });
  assert.equal(ev.status, 201); assert.deepEqual(ev.body.data.related, [bug.body.data.id]);
  assert.equal((await second.post("/api/evidence").send({ projectId: otherId, name: "bad.png", type: "Imagen", sizeBytes: 1, related: bug.body.data.id })).status, 400);
  assert.equal((await second.get("/api/evidence")).body.data.length, 0);
  const invalidLogin = await first.post("/api/auth/login").send({ email: "member-a@example.test", password: "wrong password" });
  assert.equal(invalidLogin.status, 401);
  const login = await first.post("/api/auth/login").send({ email: "MEMBER-A@example.test", password });
  assert.equal(login.status, 200);
  const cookie = login.headers["set-cookie"][0].split(";")[0];
  const token = cookie.split("=")[1];
  first.set("X-CSRF-Token", login.body.data.csrfToken);
  const stored = await pool.query("SELECT password_hash FROM qa.users WHERE id=$1", [userIds[0]]);
  assert.ok(stored.rows[0].password_hash.startsWith("scrypt-v1$"));
  assert.notEqual(stored.rows[0].password_hash, password);
  const sessions = await pool.query("SELECT token_hash FROM qa.auth_sessions WHERE user_id=$1", [userIds[0]]);
  assert.equal(sessions.rows.length, 1);
  assert.equal(sessions.rows[0].token_hash, sessionHash(token));
  const freshPool = createPool(process.env.TEST_DATABASE_URL);
  try {
    const freshApp = createApp(new PostgresRepository(freshPool), new PostgresAuth(freshPool));
    const reloaded = await request(freshApp).get("/api/auth/me").set("Cookie", cookie);
    assert.equal(reloaded.status, 200);
    assert.equal((await request(freshApp).get("/api/bugs").set("Cookie", cookie)).body.data[0].id, bug.body.data.id);
  } finally { await freshPool.end(); }
  assert.equal((await request(app).post("/api/bugs").set("Cookie", cookie).send({ projectId, title: "CSRF", priority: "Alta" })).status, 403);
  assert.equal((await first.post("/api/auth/logout").send({})).status, 204);
  assert.equal((await request(app).get("/api/auth/me").set("Cookie", cookie)).status, 401);
  await pool.query("UPDATE qa.auth_sessions SET created_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE user_id=$1", [userIds[1]]);
  assert.equal((await second.get("/api/auth/me")).status, 401);
  console.info("Integración correcta: registro/login/logout, hashes, sesiones persistentes y expiradas, CSRF, aislamiento, CRUD de creación y rollback.");
} finally {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of ["evidence_links", "evidence", "bug_test_cases", "test_run_results", "test_runs", "test_case_steps", "test_cases", "bugs"]) {
      await client.query(`DELETE FROM qa.${table} WHERE project_id IN (SELECT id FROM qa.projects WHERE organization_id=ANY($1::bigint[]))`, [orgIds]);
    }
    await client.query("DELETE FROM qa.projects WHERE organization_id=ANY($1::bigint[])", [orgIds]);
    await client.query("DELETE FROM qa.organization_members WHERE user_id=ANY($1::bigint[])", [userIds]);
    await client.query("DELETE FROM qa.organizations WHERE id=ANY($1::bigint[])", [orgIds]);
    await client.query("DELETE FROM qa.users WHERE id=ANY($1::bigint[])", [userIds]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); await pool.end(); }
}