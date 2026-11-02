import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createPool } from "../src/database.js";
import { createApp } from "../src/app.js";
import { PostgresRepository } from "../src/repositories/postgres.repository.js";
import { PostgresAuth } from "../src/auth/auth.js";
if (!process.env.TEST_DATABASE_URL)
  throw new Error("Define TEST_DATABASE_URL para PostgreSQL efímero.");
const pool = createPool(process.env.TEST_DATABASE_URL),
  app = createApp(new PostgresRepository(pool), new PostgresAuth(pool));
const owner = request.agent(app),
  viewer = request.agent(app),
  other = request.agent(app);
let cleanupError: unknown;
const users: string[] = [],
  orgs: string[] = [];
try {
  for (const agent of [owner, viewer, other]) {
    const r = await agent.post("/api/auth/register").send({
      name: "Analítica QA",
      email: `${randomUUID()}@example.test`,
      password: "temporary analytics password",
    });
    assert.equal(r.status, 201);
    users.push(r.body.data.user.id);
    agent.set("X-CSRF-Token", r.body.data.csrfToken);
    orgs.push((await agent.get("/api/projects")).body.data[0].organizationId);
  }
  const projectId = (await owner.get("/api/projects")).body.data[0].id,
    otherId = (await other.get("/api/projects")).body.data[0].id;
  await pool.query("INSERT INTO qa.organization_members(organization_id,user_id) VALUES($1,$2)", [
    orgs[0],
    users[1],
  ]);
  assert.equal(
    (
      await owner
        .put(`/api/project-members/${users[1]}`)
        .query({ projectId })
        .send({ role: "Solo lectura", revision: 0 })
    ).status,
    204,
  );
  const date = new Date().toISOString().slice(0, 10),
    params = { projectId, from: date, to: date };
  async function metrics() {
    const r = await viewer.get("/api/analytics").query(params);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body.data;
  }
  let a = await metrics();
  assert.equal(a.summary.approvalRate, null);
  assert.equal(a.summary.bugs, 0);
  assert.equal(a.bugTrend[0].open, 0);
  assert.equal((await other.get("/api/analytics").query(params)).status, 404);
  assert.equal(
    (await owner.get("/api/analytics").query({ ...params, from: "2026-02-30" })).status,
    400,
  );
  assert.equal(
    (await owner.get("/api/analytics").query({ ...params, from: "2020-01-01" })).status,
    400,
  );
  const tc = await owner.post("/api/test-cases").send({
    projectId,
    title: "Caso original",
    testType: "Seguridad",
    lifecycle: "Listo",
    steps: [{ action: "Enviar credenciales", expectedResult: "Denegar acceso" }],
  });
  assert.equal(tc.status, 201);
  const caseId = tc.body.data.id;
  const run = await owner
    .post("/api/test-runs")
    .send({ projectId, title: "Ejecución histórica", owner: "QA", caseIds: [caseId] });
  assert.equal(run.status, 201, JSON.stringify(run.body));
  const runId = run.body.data.id,
    resultId = run.body.data.results[0].id;
  assert.equal(
    (
      await owner
        .patch(`/api/test-runs/${runId}/results/${resultId}`)
        .send({ projectId, status: "failed", notes: "Respuesta incorrecta" })
    ).status,
    200,
  );
  const bug = await owner
    .post("/api/bugs")
    .send({ projectId, title: "Fallo analítica", priority: "Alta", sourceResultId: resultId });
  assert.equal(bug.status, 201, JSON.stringify(bug.body));
  const bugId = bug.body.data.id;
  a = await metrics();
  assert.equal(a.summary.openBugs, 1);
  assert.equal(a.summary.approvalRate, 0);
  assert.equal(a.frequentFailures[0].failures, 1);
  assert.equal(a.typeCoverage[0].executed, 1);
  assert.equal(a.runTrend[0].approvalRate, 0);
  assert.equal(a.bugTrend[0].open, 1);
  for (const status of ["En progreso", "En revisión", "Resuelto"])
    assert.equal(
      (await owner.patch(`/api/bugs/${bugId}/status`).send({ projectId, status })).status,
      200,
    );
  a = await metrics();
  assert.equal(a.summary.closedBugs, 1);
  assert.equal(a.bugTrend[0].closed, 1);
  assert.equal(a.bugTrend[0].open, 0);
  assert.equal(
    (await owner.patch(`/api/bugs/${bugId}/status`).send({ projectId, status: "Abierto" })).status,
    200,
  );
  a = await metrics();
  assert.equal(a.bugTrend[0].open, 1);
  const workflow = (await owner.get("/api/bug-workflow").query({ projectId })).body.data;
  assert.equal(
    (
      await owner
        .put("/api/bug-workflow")
        .query({ projectId })
        .send({ ...workflow, closedStates: ["Abierto", "Resuelto"] })
    ).status,
    200,
  );
  a = await metrics();
  assert.equal(a.bugTrend[0].closed, 1);
  const input = {
      projectId,
      code: "REQ-LOGIN",
      title: "Acceso seguro",
      description: "Validar credenciales",
      caseIds: [caseId],
    },
    key = randomUUID();
  const req = await owner.post("/api/requirements").set("Idempotency-Key", key).send(input);
  assert.equal(req.status, 201, JSON.stringify(req.body));
  const requirement = req.body.data;
  assert.equal(
    (await owner.post("/api/requirements").set("Idempotency-Key", key).send(input)).body.data.id,
    requirement.id,
  );
  assert.equal(
    (
      await owner
        .post("/api/requirements")
        .set("Idempotency-Key", key)
        .send({ ...input, title: "Diferente" })
    ).status,
    409,
  );
  assert.equal(
    (await viewer.post("/api/requirements").set("Idempotency-Key", randomUUID()).send(input))
      .status,
    403,
  );
  const foreignCase = (
    await other.post("/api/test-cases").send({ projectId: otherId, title: "Ajeno" })
  ).body.data.id;
  assert.equal(
    (
      await owner
        .post("/api/requirements")
        .set("Idempotency-Key", randomUUID())
        .send({ ...input, code: "REQ-INVALID", caseIds: [foreignCase] })
    ).status,
    400,
  );
  let matrix = await viewer.get("/api/coverage-matrix").query({ projectId, limit: 1 });
  assert.equal(matrix.status, 200, JSON.stringify(matrix.body));
  assert.equal(matrix.body.data.rows[0].bugId, bugId);
  assert.equal(matrix.body.data.rows[0].caseId, caseId);
  assert.equal(
    (
      await viewer
        .post("/api/coverage-links")
        .query({ projectId })
        .send({ requirementId: requirement.id, caseId, bugId })
    ).status,
    403,
  );
  assert.equal(
    (
      await owner
        .patch(`/api/requirements/${requirement.id}`)
        .send({ ...input, title: "Acceso actualizado", version: 1 })
    ).status,
    200,
  );
  assert.equal(
    (await owner.patch(`/api/requirements/${requirement.id}`).send({ ...input, version: 1 }))
      .status,
    409,
  );
  const listed = await viewer
    .get("/api/requirements")
    .query({ projectId, search: "LOGIN", limit: 1 });
  assert.equal(listed.status, 200, JSON.stringify(listed.body));
  assert.equal(listed.body.data.total, 1);
  assert.equal(
    (
      await owner
        .post("/api/requirements")
        .set("Idempotency-Key", randomUUID())
        .send({ ...input, code: "REQ-EMPTY", caseIds: [] })
    ).status,
    201,
  );
  matrix = await viewer.get("/api/coverage-matrix").query({ projectId, offset: 1 });
  assert.equal(matrix.body.data.rows[0].caseId, null);
  a = await metrics();
  assert.equal(a.summary.requirements, 2);
  assert.equal(a.summary.coveredRequirements, 1);
  const tags = {
      rows: [
        { name: "Regresión importada", color: "#7462df" },
        { name: "Seguridad importada", color: "#22aa44" },
      ],
    },
    tagKey = randomUUID();
  const sendTags = (body: unknown, k = tagKey) =>
    owner.post("/api/imports/tags").query({ projectId }).set("Idempotency-Key", k).send(body);
  const imported = await sendTags(tags);
  assert.equal(imported.status, 200, JSON.stringify(imported.body));
  assert.deepEqual(imported.body.data, { created: 2, existing: 0 });
  assert.deepEqual((await sendTags(tags)).body.data, imported.body.data);
  assert.equal((await sendTags({ rows: [{ name: "Otro", color: "#ffffff" }] })).status, 409);
  assert.deepEqual((await sendTags(tags, randomUUID())).body.data, { created: 0, existing: 2 });
  assert.equal(
    (
      await viewer
        .post("/api/imports/tags")
        .query({ projectId })
        .set("Idempotency-Key", randomUUID())
        .send(tags)
    ).status,
    403,
  );
  assert.equal(
    (
      await sendTags(
        {
          rows: [
            { name: "Debe revertirse", color: "#ffffff" },
            { name: "Regresión importada", color: "#ffffff" },
          ],
        },
        randomUUID(),
      )
    ).status,
    409,
  );
  assert.ok(
    !(await owner.get("/api/tags").query({ projectId })).body.data.some(
      (t: { name: string }) => t.name === "Debe revertirse",
    ),
  );
  assert.equal(
    (
      await owner.patch(`/api/test-cases/${caseId}`).send({
        projectId,
        title: "Caso modificado",
        suite: "",
        preconditions: "",
        testType: "Seguridad",
        lifecycle: "Listo",
        version: 1,
        steps: [{ action: "Otro paso", expectedResult: "Otro resultado" }],
      })
    ).status,
    200,
  );
  const report = await viewer.get(`/api/test-runs/${runId}/report`).query({ projectId });
  assert.equal(report.status, 200, JSON.stringify(report.body));
  assert.equal(report.body.data.results[0].title, "Caso original");
  assert.equal(report.body.data.results[0].steps[0].action, "Enviar credenciales");
  assert.equal(report.body.data.results[0].notes, "Respuesta incorrecta");
  assert.deepEqual(report.body.data.results[0].bugIds, [bugId]);
  assert.equal(
    (await other.get(`/api/test-runs/${runId}/report`).query({ projectId })).status,
    404,
  );
  assert.equal(
    (await owner.delete(`/api/bugs/${bugId}`).query({ projectId }).send({})).status,
    409,
  );
  const disposable = await owner
    .post("/api/bugs")
    .send({ projectId, title: "Temporal", priority: "Baja" });
  assert.equal(
    (await owner.delete(`/api/bugs/${disposable.body.data.id}`).query({ projectId }).send({}))
      .status,
    204,
  );
  a = await metrics();
  assert.equal(a.bugTrend[0].open, 0);
  assert.equal(a.bugTrend[0].closed, 1);
  // Manual links refresh as an exact requirement/case/bug result, regardless of the previous page.
  const manual = await owner
    .post("/api/bugs")
    .send({ projectId, title: "Bug manual de cobertura", priority: "Media" });
  assert.equal(manual.status, 201);
  const linkInput = { requirementId: requirement.id, caseId, bugId: manual.body.data.id };
  for (let attempt = 0; attempt < 2; attempt++)
    assert.equal(
      (await owner.post("/api/coverage-links").query({ projectId }).send(linkInput)).status,
      204,
    );
  const focused = await viewer
    .get("/api/coverage-matrix")
    .query({ projectId, ...linkInput, limit: 50 });
  assert.equal(focused.status, 200);
  assert.equal(focused.body.data.total, 1);
  assert.equal(focused.body.data.rows[0].bugId, manual.body.data.id);
  assert.equal(
    (
      await viewer.get("/api/coverage-matrix").query({
        projectId,
        requirementId: requirement.id,
        caseId: foreignCase,
        bugId: manual.body.data.id,
      })
    ).body.data.total,
    0,
  );
  assert.equal(
    (await viewer.get("/api/coverage-matrix").query({ projectId, caseId: "BUG-1" })).status,
    400,
  );
  console.info(
    "Analítica: agregaciones, transiciones, reaperturas, reclasificación, cobertura, permisos, snapshots e importación idempotente verificados.",
  );
} finally {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const table of [
      "tags",
      "comments",
      "requirement_cases",
      "requirements",
      "evidence_links",
      "evidence",
      "bug_test_cases",
      "bugs",
      "test_run_results",
      "test_runs",
      "test_plan_cases",
      "test_plans",
      "test_case_steps",
      "test_cases",
      "project_bug_workflows",
    ])
      await c.query(
        `DELETE FROM qa.${table} WHERE project_id IN(SELECT id FROM qa.projects WHERE organization_id=ANY($1::bigint[]))`,
        [orgs],
      );
    await c.query("DELETE FROM qa.projects WHERE organization_id=ANY($1::bigint[])", [orgs]);
    await c.query("DELETE FROM qa.organization_members WHERE user_id=ANY($1::bigint[])", [users]);
    await c.query("DELETE FROM qa.organizations WHERE id=ANY($1::bigint[])", [orgs]);
    await c.query("DELETE FROM qa.users WHERE id=ANY($1::bigint[])", [users]);
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    cleanupError = e;
  } finally {
    c.release();
    await pool.end();
  }
}

if (cleanupError) throw cleanupError;
