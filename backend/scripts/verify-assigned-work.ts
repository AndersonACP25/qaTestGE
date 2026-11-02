// Explicit disposable PostgreSQL only; never loads .env.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createPool } from "../src/database.js";
import { createApp } from "../src/app.js";
import { PostgresRepository } from "../src/repositories/postgres.repository.js";
import { PostgresAuth } from "../src/auth/auth.js";
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL efímero requerido.");
const pool = createPool(process.env.TEST_DATABASE_URL),
  app = createApp(new PostgresRepository(pool), new PostgresAuth(pool));
const admin = request.agent(app),
  colleague = request.agent(app),
  outsider = request.agent(app);
const users: string[] = [],
  orgs: string[] = [];
try {
  for (const agent of [admin, colleague, outsider]) {
    const r = await agent.post("/api/auth/register").send({
      name: "Nombre repetido",
      email: `${randomUUID()}@example.test`,
      password: "temporary assigned work password",
    });
    assert.equal(r.status, 201);
    users.push(r.body.data.user.id);
    agent.set("X-CSRF-Token", r.body.data.csrfToken);
    orgs.push((await agent.get("/api/projects")).body.data[0].organizationId);
  }
  const projectId = (await admin.get("/api/projects")).body.data[0].id;
  await pool.query("INSERT INTO qa.organization_members(organization_id,user_id) VALUES($1,$2)", [
    orgs[0],
    users[1],
  ]);
  assert.equal(
    (
      await admin
        .put(`/api/project-members/${users[1]}`)
        .query({ projectId })
        .send({ role: "QA", revision: 0 })
    ).status,
    204,
  );
  const bug = await admin
    .post("/api/bugs")
    .send({ projectId, title: "Bug asignado", priority: "Alta", assigneeUserId: users[1] });
  assert.equal(bug.status, 201);
  const tc = await admin.post("/api/test-cases").send({
    projectId,
    title: "Caso asignado",
    assigneeUserId: users[1],
    steps: [{ action: "Abrir", expectedResult: "Correcto" }],
  });
  assert.equal(tc.status, 201);
  const input = {
    projectId,
    title: "Run asignado",
    owner: "Nombre visible",
    ownerUserId: users[1],
    caseIds: [tc.body.data.id],
  };
  const key = randomUUID();
  const run = await admin.post("/api/test-runs").set("Idempotency-Key", key).send(input);
  assert.equal(run.status, 201, JSON.stringify(run.body));
  assert.equal(run.body.data.ownerUserId, users[1]);
  assert.equal(
    (await admin.post("/api/test-runs").set("Idempotency-Key", key).send(input)).body.data.id,
    run.body.data.id,
  );
  assert.equal(
    (await admin.post("/api/test-runs").send({ ...input, ownerUserId: users[2] })).status,
    400,
  );
  assert.equal(
    (await admin.post("/api/test-runs").send({ ...input, ownerUserId: "x" })).status,
    400,
  );
  const own = await admin
    .post("/api/test-runs")
    .send({ ...input, ownerUserId: undefined, title: "Creado por mí" });
  assert.equal(own.status, 201);
  assert.equal(own.body.data.ownerUserId, users[0]);
  const page = await colleague.get("/api/assigned-work").query({ projectId });
  assert.equal(page.status, 200, JSON.stringify(page.body));
  assert.equal(page.body.data.total, 3);
  assert.deepEqual(
    new Set(page.body.data.items.map((item: { kind: string }) => item.kind)),
    new Set(["bug", "case", "run"]),
  );
  assert.equal(
    (await admin.get("/api/assigned-work").query({ projectId, userId: users[1] })).body.data.total,
    1,
    "userId no permite consultar otra cuenta, incluso con nombres repetidos",
  );
  assert.equal((await outsider.get("/api/assigned-work").query({ projectId })).status, 404);
  assert.equal(
    (
      await colleague
        .get("/api/assigned-work")
        .query({ projectId, kind: "bug", status: "Abierto", search: "BUG-" })
    ).body.data.total,
    1,
  );
  for (const query of [{ page: 0 }, { pageSize: 10000 }, { page: 1.1 }, { kind: "user" }])
    assert.equal(
      (await colleague.get("/api/assigned-work").query({ projectId, ...query })).status,
      400,
    );
  const empty = await colleague.get("/api/assigned-work").query({ projectId, page: 2 });
  assert.equal(empty.body.data.total, 3);
  assert.equal(empty.body.data.items.length, 0);
  // Reassign the run. Stable identity, not a shared display name, controls visibility.
  const updated = await admin
    .patch(`/api/test-runs/${run.body.data.id}`)
    .send({ ...input, ownerUserId: users[0], status: "En curso" });
  assert.equal(updated.status, 200);
  assert.equal(
    (await colleague.get("/api/assigned-work").query({ projectId, kind: "run" })).body.data.total,
    0,
  );
  assert.equal(
    (await admin.get("/api/assigned-work").query({ projectId, kind: "run" })).body.data.total,
    2,
  );
  // Create enough real resources to verify non-overlapping pages and exact totals.
  await pool.query(
    "INSERT INTO qa.bugs(project_id,title,priority,assignee_user_id,assignee_organization_id) SELECT $1,'Paginación '||n,'Media',$2,$3 FROM generate_series(1,28) n",
    [projectId, users[1], orgs[0]],
  );
  const first = (await colleague.get("/api/assigned-work").query({ projectId, pageSize: 10 })).body
    .data;
  const second = (
    await colleague.get("/api/assigned-work").query({ projectId, pageSize: 10, page: 2 })
  ).body.data;
  assert.equal(first.total, 30);
  assert.equal(first.items.length, 10);
  assert.equal(second.items.length, 10);
  assert.ok(
    second.items.every(
      (item: { id: string }) => !first.items.some((row: { id: string }) => row.id === item.id),
    ),
  );
  const onlyRun = await admin
    .post("/api/test-runs")
    .send({ ...input, title: "Solo ejecución asignada" });
  assert.equal(onlyRun.status, 201);
  await pool.query(
    "UPDATE qa.bugs SET assignee_user_id=NULL,assignee_organization_id=NULL WHERE project_id=$1",
    [projectId],
  );
  await pool.query(
    "UPDATE qa.test_cases SET assignee_user_id=NULL,assignee_organization_id=NULL WHERE project_id=$1",
    [projectId],
  );
  assert.equal(
    (
      await admin
        .put(`/api/project-members/${users[1]}`)
        .query({ projectId })
        .send({ role: null, revision: 1 })
    ).status,
    409,
  );
  await pool.query("UPDATE qa.users SET is_active=false WHERE id=$1", [users[1]]);
  assert.equal(
    (await admin.post("/api/test-runs").send({ ...input, title: "Cuenta inactiva" })).status,
    400,
  );
  await pool.query("UPDATE qa.users SET is_active=true WHERE id=$1", [users[1]]);
  // Membership removal cannot leave assigned runs orphaned.
  assert.equal(
    (await admin.delete(`/api/teams/${orgs[0]}/members/${users[1]}`).send({})).status,
    409,
  );
  const binary = Buffer.from("evidence for designer");
  for (const related of [bug.body.data.id, tc.body.data.id]) {
    const evidence = await colleague
      .post(`/api/evidence/upload?projectId=${projectId}&name=diseno.txt&related=${related}`)
      .set("Content-Type", "text/plain")
      .send(binary);
    assert.equal(evidence.status, 201);
    assert.ok(evidence.body.data.related.includes(related));
  }
  console.info(
    "Asignaciones: identidad estable, filtros/paginación, aislamiento, reintentos, responsables de runs y evidencias de diseñadores verificados.",
  );
} finally {
  for (const table of [
    "comments",
    "evidence_links",
    "evidence",
    "bug_test_cases",
    "bugs",
    "test_run_results",
    "test_runs",
    "test_case_steps",
    "test_cases",
    "project_bug_workflows",
  ])
    await pool.query(
      `DELETE FROM qa.${table} WHERE project_id IN (SELECT id FROM qa.projects WHERE organization_id=ANY($1::bigint[]))`,
      [orgs],
    );
  await pool.query("DELETE FROM qa.projects WHERE organization_id=ANY($1::bigint[])", [orgs]);
  await pool.query("DELETE FROM qa.organization_members WHERE user_id=ANY($1::bigint[])", [users]);
  await pool.query("DELETE FROM qa.organizations WHERE id=ANY($1::bigint[])", [orgs]);
  await pool.query("DELETE FROM qa.users WHERE id=ANY($1::bigint[])", [users]);
  await pool.end();
}
