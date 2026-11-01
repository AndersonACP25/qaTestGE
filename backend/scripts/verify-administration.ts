// Requires an explicitly selected disposable database; never reads backend/.env.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createPool } from "../src/database.js";
import { createApp } from "../src/app.js";
import { PostgresRepository } from "../src/repositories/postgres.repository.js";
import { PostgresAuth } from "../src/auth/auth.js";
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL efímero requerido.");
const pool = createPool(process.env.TEST_DATABASE_URL);
const app = createApp(new PostgresRepository(pool), new PostgresAuth(pool));
const owner = request.agent(app),
  outsider = request.agent(app);
const users: string[] = [],
  orgs: string[] = [];
try {
  for (const agent of [owner, outsider]) {
    const created = await agent.post("/api/auth/register").send({
      name: "Admin integración",
      email: `${randomUUID()}@example.test`,
      password: "temporary admin password",
    });
    assert.equal(created.status, 201);
    users.push(created.body.data.user.id);
    agent.set("X-CSRF-Token", created.body.data.csrfToken);
    orgs.push((await agent.get("/api/projects")).body.data[0].organizationId);
  }
  const projectId = (await owner.get("/api/projects")).body.data[0].id;
  const sibling = await owner
    .post("/api/projects")
    .send({ organizationId: orgs[0], name: "Proyecto aislado", description: "" });
  assert.equal(sibling.status, 201);
  const agents = [];
  const credentials = [];
  for (const role of ["Admin", "QA", "Dev", "Solo lectura"]) {
    const input = {
      name: `Creado ${role}`,
      email: `${randomUUID()}@example.test`,
      password: "created account password",
      role,
    };
    const key = randomUUID();
    const create = () =>
      owner.post("/api/project-users").query({ projectId }).set("Idempotency-Key", key).send(input);
    const results = await Promise.all([create(), create()]);
    assert.deepEqual(
      results.map((r) => r.status),
      [201, 201],
    );
    assert.equal(results[0].body.data.id, results[1].body.data.id);
    users.push(results[0].body.data.id);
    credentials.push(input);
    assert.equal(results[0].body.data.role, role);
    assert.equal(results[0].body.data.owner, false);
    assert.equal(
      (
        await owner
          .post("/api/project-users")
          .query({ projectId })
          .set("Idempotency-Key", key)
          .send({ ...input, role: "QA", name: "Cambio" })
      ).status,
      409,
    );
    assert.equal(
      (
        await owner
          .post("/api/project-users")
          .query({ projectId })
          .set("Idempotency-Key", key)
          .send({ ...input, password: "different password here" })
      ).status,
      409,
    );
    assert.equal(
      (
        await owner
          .post("/api/project-users")
          .query({ projectId })
          .set("Idempotency-Key", randomUUID())
          .send(input)
      ).status,
      409,
    );
    const agent = request.agent(app);
    const login = await agent
      .post("/api/auth/login")
      .send({ email: input.email, password: input.password });
    assert.equal(login.status, 200);
    agent.set("X-CSRF-Token", login.body.data.csrfToken);
    agents.push(agent);
    const projects = await agent.get("/api/projects");
    assert.deepEqual(
      projects.body.data.map((p: { id: string }) => p.id),
      [projectId],
    );
    assert.equal(
      (await agent.get("/api/bugs").query({ projectId: sibling.body.data.id })).status,
      404,
    );
  }
  const input = { ...credentials[0], email: `${randomUUID()}@example.test` };
  for (const agent of agents.slice(1)) {
    assert.equal(
      (
        await agent
          .post("/api/project-users")
          .query({ projectId })
          .set("Idempotency-Key", randomUUID())
          .send(input)
      ).status,
      403,
    );
    assert.equal(
      (
        await agent
          .put("/api/audit-settings")
          .query({ projectId })
          .send({ profile: "Seguridad", detail: "Resumen", pageSize: 25, version: 0 })
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await outsider
        .post("/api/project-users")
        .query({ projectId })
        .set("Idempotency-Key", randomUUID())
        .send(input)
    ).status,
    404,
  );
  assert.equal((await outsider.get("/api/audit-settings").query({ projectId })).status, 404);
  assert.equal(
    (
      await owner
        .post("/api/project-users")
        .query({ projectId })
        .set("Idempotency-Key", randomUUID())
        .send({ ...input, organizationRole: "owner" })
    ).status,
    400,
  );
  const count = await pool.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM qa.users WHERE email=$1",
    [input.email],
  );
  assert.equal(
    count.rows[0].count,
    0,
    "una denegación o validación fallida no deja cuentas huérfanas",
  );
  const settings = (await agents[3].get("/api/audit-settings").query({ projectId })).body.data;
  assert.equal(settings.version, 0);
  const saves = await Promise.all(
    [owner, agents[0]].map((agent) =>
      agent
        .put("/api/audit-settings")
        .query({ projectId })
        .send({ ...settings, profile: "Seguridad", pageSize: 25 }),
    ),
  );
  assert.deepEqual(saves.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await owner.get("/api/audit-settings").query({ projectId })).body.data.version, 1);
  for (const query of [
    { from: "2026-02-30" },
    { from: "2026-02-02", to: "2026-02-01" },
    { actorId: "9223372036854775808" },
    { limit: 10000 },
  ])
    assert.equal((await owner.get("/api/activity").query({ projectId, ...query })).status, 400);
  const security = await owner.get("/api/activity").query({
    projectId,
    profile: "Seguridad",
    kind: "user",
    operation: "provision",
    actorId: users[0],
    limit: 25,
  });
  assert.equal(security.status, 200);
  assert.equal(security.body.data.length, 4);
  assert.ok(
    security.body.data.every(
      (r: { kind: string; actorId: string }) => r.kind === "user" && r.actorId === users[0],
    ),
  );
  assert.ok(!JSON.stringify(security.body.data).includes("password"));
  assert.ok(!JSON.stringify(security.body.data).includes("@example.test"));
  const cursor = security.body.data[1].id;
  const older = await owner.get("/api/activity").query({ projectId, kind: "user", before: cursor });
  assert.equal(older.body.data.length, 2);
  assert.equal(
    (await owner.get("/api/activity").query({ projectId, profile: "Calidad", kind: "user" })).body
      .data.length,
    0,
  );
  assert.equal(
    (
      await owner
        .get("/api/activity")
        .query({ projectId, kind: "user", from: "2001-01-01", to: "2001-01-01" })
    ).body.data.length,
    0,
  );
  assert.equal(
    (await owner.get("/api/activity").query({ projectId, search: "' OR true --" })).body.data
      .length,
    0,
  );
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(
    (
      await owner
        .get("/api/activity")
        .query({ projectId, kind: "audit-config", from: today, to: today })
    ).body.data.length,
    1,
  );
  const bug = await owner
    .post("/api/bugs")
    .send({ projectId, title: "Evidencia de menciones", priority: "Media" });
  assert.equal(bug.status, 201);
  // More than the inbox's 100 rows: bulk read must cover all and isolate recipients.
  const seeded = await pool.query<{ id: string }>(
    `INSERT INTO qa.comments(project_id,bug_id,author_id,body,request_key,request_hash) SELECT $1,$2,$3,'Mención de prueba',gen_random_uuid(),'integration' FROM generate_series(1,105) RETURNING id::text`,
    [projectId, bug.body.data.id.replace("BUG-", ""), users[0]],
  );
  for (const recipient of [users[3], users[4]])
    await pool.query(
      "INSERT INTO qa.mention_notifications(project_id,comment_id,user_id) SELECT $1,unnest($2::bigint[]),$3",
      [projectId, seeded.rows.map((r) => r.id), recipient],
    );
  assert.equal(
    (await agents[1].get("/api/mention-notifications").query({ projectId })).body.data.length,
    100,
  );
  const bulk = await agents[1]
    .patch("/api/mention-notifications/read-all")
    .query({ projectId })
    .send({});
  assert.equal(bulk.status, 200);
  assert.equal(bulk.body.data.updated, 105);
  assert.equal(
    (await agents[1].patch("/api/mention-notifications/read-all").query({ projectId }).send({}))
      .body.data.updated,
    0,
  );
  assert.ok(
    (await agents[2].get("/api/mention-notifications").query({ projectId })).body.data.every(
      (r: { readAt: string | null }) => r.readAt === null,
    ),
  );
  const preserved = await pool.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM qa.mention_notifications WHERE project_id=$1 AND user_id=$2 AND read_at IS NOT NULL",
    [projectId, users[3]],
  );
  assert.equal(preserved.rows[0].n, 105);
  assert.equal(
    (await outsider.patch("/api/mention-notifications/read-all").query({ projectId }).send({}))
      .status,
    404,
  );
  console.info(
    "Administración: altas concurrentes/idempotentes por rol, login real, aislamiento, denegaciones, auditoría filtrada, conflicto de configuración y lectura masiva >100 verificados.",
  );
} finally {
  await pool.query(
    "DELETE FROM qa.comments WHERE project_id IN (SELECT id FROM qa.projects WHERE organization_id=ANY($1::bigint[]))",
    [orgs],
  );
  await pool.query(
    "DELETE FROM qa.bugs WHERE project_id IN (SELECT id FROM qa.projects WHERE organization_id=ANY($1::bigint[]))",
    [orgs],
  );
  await pool.query(
    "DELETE FROM qa.project_bug_workflows WHERE project_id IN (SELECT id FROM qa.projects WHERE organization_id=ANY($1::bigint[]))",
    [orgs],
  );
  await pool.query("DELETE FROM qa.projects WHERE organization_id=ANY($1::bigint[])", [orgs]);
  await pool.query("DELETE FROM qa.organization_members WHERE user_id=ANY($1::bigint[])", [users]);
  await pool.query("DELETE FROM qa.organizations WHERE id=ANY($1::bigint[])", [orgs]);
  await pool.query("DELETE FROM qa.users WHERE id=ANY($1::bigint[])", [users]);
  await pool.end();
}
