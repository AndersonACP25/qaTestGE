// Requires an explicitly selected ephemeral PostgreSQL database, never loads .env.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createPool } from "../src/database.js";
import { createApp } from "../src/app.js";
import { PostgresRepository } from "../src/repositories/postgres.repository.js";
import { PostgresAuth } from "../src/auth/auth.js";
if (!process.env.TEST_DATABASE_URL)
  throw new Error("Define TEST_DATABASE_URL para una base efímera.");
const pool = createPool(process.env.TEST_DATABASE_URL);
const app = createApp(new PostgresRepository(pool), new PostgresAuth(pool));
const agent = request.agent(app);
const other = request.agent(app);
let cleanupError: unknown;
const orgIds: string[] = [];
const userIds: string[] = [];
try {
  for (const client of [agent, other]) {
    const auth = await client.post("/api/auth/register").send({
      name: "Quality QA",
      email: `${randomUUID()}@example.test`,
      password: "quality isolated password",
    });
    assert.equal(auth.status, 201);
    client.set("X-CSRF-Token", auth.body.data.csrfToken);
    userIds.push(auth.body.data.user.id);
    const project = (await client.get("/api/projects")).body.data[0];
    orgIds.push(project.organizationId);
  }
  const projectId = (await agent.get("/api/projects")).body.data[0].id;
  const foreign = (await other.get("/api/projects")).body.data[0].id;
  const caseInput = {
    projectId,
    title: "Acceso original",
    suite: "Acceso",
    testType: "Seguridad",
    lifecycle: "Listo",
    steps: [{ action: "Enviar credenciales", expectedResult: "Rechazar" }],
  };
  const tc = (await agent.post("/api/test-cases").send(caseInput)).body.data;
  assert.equal(tc.version, 1);
  assert.equal(tc.testType, "Seguridad");
  let history = await agent.get(`/api/test-cases/${tc.id}/history`).query({ projectId });
  assert.equal(history.status, 200);
  assert.equal(history.body.data[0].snapshot.steps[0].action, "Enviar credenciales");
  const planInput = {
    projectId,
    name: "Ciclo de seguridad",
    description: "Release",
    caseIds: [tc.id],
  };
  const planKey = randomUUID();
  const plan = await agent.post("/api/test-plans").set("Idempotency-Key", planKey).send(planInput);
  assert.equal(plan.status, 201);
  const planReplay = await agent
    .post("/api/test-plans")
    .set("Idempotency-Key", planKey)
    .send(planInput);
  assert.equal(planReplay.status, 201);
  assert.equal(planReplay.body.data.id, plan.body.data.id);
  assert.equal((await other.get("/api/test-plans").query({ projectId })).status, 404);
  assert.equal((await agent.get("/api/bug-workflow").query({ projectId: foreign })).status, 404);
  assert.equal(
    (await other.get(`/api/test-cases/${tc.id}/history`).query({ projectId })).status,
    404,
  );
  assert.equal(
    (await agent.post("/api/test-plans").send({ ...planInput, projectId: foreign })).status,
    404,
  );
  const foreignCase = (
    await other.post("/api/test-cases").send({ ...caseInput, projectId: foreign })
  ).body.data;
  assert.equal(
    (await agent.post("/api/test-plans").send({ ...planInput, caseIds: [foreignCase.id] })).status,
    400,
  );
  assert.equal(
    (await agent.patch(`/api/test-plans/${plan.body.data.id}`).send({ ...planInput, revision: 99 }))
      .status,
    409,
  );
  const runResponse = await agent
    .post("/api/test-runs")
    .send({ projectId, title: "Ciclo uno", owner: "QA", planId: plan.body.data.id });
  assert.equal(runResponse.status, 201);
  const run = runResponse.body.data;
  assert.equal(run.caseCount, 1);
  assert.equal(run.planId, plan.body.data.id);
  const result = run.results[0];
  assert.equal(
    (
      await agent
        .post("/api/bugs")
        .send({ projectId, title: "Sin ejecutar", priority: "Alta", sourceResultId: result.id })
    ).status,
    400,
  );
  assert.equal(
    (
      await agent
        .patch(`/api/test-runs/${run.id}/results/${result.id}`)
        .send({ projectId, status: "failed", notes: "Respuesta incorrecta" })
    ).status,
    200,
  );
  const evidence = await agent
    .post("/api/evidence")
    .send({ projectId, name: "Captura", type: "Imagen", sizeBytes: 1, related: result.id });
  assert.equal(evidence.status, 201);
  const bugInput = {
    projectId,
    title: "Fallo de acceso",
    description: "Respuesta incorrecta",
    priority: "Alta",
    severity: "Crítica",
    environment: "UAT",
    affectedVersion: "2.0",
    sourceResultId: result.id,
  };
  const key = randomUUID();
  const bug = await agent.post("/api/bugs").set("Idempotency-Key", key).send(bugInput);
  assert.equal(bug.status, 201);
  assert.equal(bug.body.data.sourceRunId, run.id);
  assert.equal(bug.body.data.sourceCaseId, tc.id);
  assert.deepEqual(bug.body.data.sourceSteps, caseInput.steps);
  assert.equal(bug.body.data.severity, "Crítica");
  assert.equal(
    (await agent.post("/api/bugs").set("Idempotency-Key", key).send(bugInput)).body.data.id,
    bug.body.data.id,
  );
  assert.equal((await agent.post("/api/bugs").send(bugInput)).status, 409);
  assert.equal(
    (await other.post("/api/bugs").send({ ...bugInput, projectId: foreign })).status,
    400,
  );
  const links = (await agent.get("/api/evidence").query({ projectId })).body.data[0].related;
  assert.ok(links.includes(bug.body.data.id));
  assert.ok(links.includes(result.id));
  const later = await agent.post("/api/evidence").send({
    projectId,
    name: "Después del bug",
    type: "Archivo",
    sizeBytes: 1,
    related: result.id,
  });
  assert.equal(later.status, 201);
  assert.ok(later.body.data.related.includes(bug.body.data.id));
  const edits = await Promise.all(
    ["Primera edición", "Segunda edición"].map((title) =>
      agent.patch(`/api/test-cases/${tc.id}`).send({
        ...caseInput,
        title,
        expectedVersion: 1,
        steps: [{ action: "Paso nuevo", expectedResult: "Esperado nuevo" }],
      }),
    ),
  );
  assert.deepEqual(edits.map((r) => r.status).sort(), [200, 409]);
  history = await agent.get(`/api/test-cases/${tc.id}/history`).query({ projectId });
  assert.equal(history.body.data.length, 2);
  assert.equal(history.body.data[1].snapshot.title, "Acceso original");
  assert.equal(history.body.data[0].snapshot.steps[0].action, "Paso nuevo");
  const copyInput = {
    projectId,
    title: "Reejecución",
    owner: "QA",
    sourceRunId: run.id,
    failedOnly: true,
  };
  const copy = await agent.post("/api/test-runs").send(copyInput);
  assert.equal(copy.status, 201);
  assert.equal(copy.body.data.progress, 0);
  assert.equal(copy.body.data.sourceRunId, run.id);
  assert.equal(copy.body.data.results[0].executedAt, null);
  assert.equal(copy.body.data.results[0].title, "Acceso original");
  assert.equal(copy.body.data.results[0].caseVersion, 1);
  assert.deepEqual(copy.body.data.results[0].steps, caseInput.steps);
  assert.equal(
    (await agent.post("/api/test-runs").send({ ...copyInput, sourceRunId: copy.body.data.id }))
      .status,
    400,
  );
  assert.equal(
    (await agent.delete(`/api/test-runs/${run.id}`).query({ projectId }).send({})).status,
    409,
  );
  assert.equal(
    (await agent.delete(`/api/test-plans/${plan.body.data.id}`).query({ projectId }).send({}))
      .status,
    409,
  );
  const workflow = await agent.get("/api/bug-workflow").query({ projectId });
  assert.equal(workflow.status, 200);
  const settings = {
    states: ["Abierto", "Triage", "Cerrado"],
    transitions: { Abierto: ["Triage"], Triage: ["Cerrado"], Cerrado: ["Abierto"] },
    closedStates: ["Cerrado"],
    revision: workflow.body.data.revision,
  };
  const changed = await agent.put("/api/bug-workflow").query({ projectId }).send(settings);
  assert.equal(changed.status, 200);
  assert.deepEqual(changed.body.data.closedStates, ["Cerrado"]);
  assert.equal(
    (await agent.put("/api/bug-workflow").query({ projectId }).send(settings)).status,
    409,
  );
  assert.equal(
    (
      await agent
        .patch(`/api/bugs/${bug.body.data.id}/status`)
        .send({ projectId, status: "Cerrado" })
    ).status,
    409,
  );
  assert.equal(
    (
      await agent
        .patch(`/api/bugs/${bug.body.data.id}/status`)
        .send({ projectId, status: "Triage" })
    ).status,
    200,
  );
  const forbiddenRemoval = {
    states: ["Abierto", "Cerrado"],
    transitions: { Abierto: ["Cerrado"], Cerrado: ["Abierto"] },
    revision: changed.body.data.revision,
  };
  assert.equal(
    (await agent.put("/api/bug-workflow").query({ projectId }).send(forbiddenRemoval)).status,
    409,
  );
  const obsolete = await agent
    .patch(`/api/test-cases/${tc.id}`)
    .send({ ...caseInput, lifecycle: "Obsoleto", expectedVersion: 2 });
  assert.equal(obsolete.status, 200);
  assert.equal(obsolete.body.data.version, 3);
  assert.equal(
    (
      await agent
        .post("/api/test-runs")
        .send({ projectId, title: "Obsoleto", owner: "QA", caseIds: [tc.id] })
    ).status,
    400,
  );
  const before = (await agent.get("/api/test-runs").query({ projectId })).body.data.length;
  assert.equal(
    (
      await agent
        .post("/api/test-runs")
        .send({ projectId, title: "Referencia inválida", owner: "QA", caseIds: [foreignCase.id] })
    ).status,
    400,
  );
  assert.equal((await agent.get("/api/test-runs").query({ projectId })).body.data.length, before);
  console.info(
    "Calidad: historial/snapshots, conflicto concurrente, planes/ciclos, reejecución de fallidos, bugs/evidencias, flujo configurable, aislamiento y rollback correctos.",
  );
} finally {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of [
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
      await client.query(
        `DELETE FROM qa.${table} WHERE project_id IN (SELECT id FROM qa.projects WHERE organization_id=ANY($1::bigint[]))`,
        [orgIds],
      );
    await client.query("DELETE FROM qa.projects WHERE organization_id=ANY($1::bigint[])", [orgIds]);
    await client.query("DELETE FROM qa.organization_members WHERE user_id=ANY($1::bigint[])", [
      userIds,
    ]);
    await client.query("DELETE FROM qa.organizations WHERE id=ANY($1::bigint[])", [orgIds]);
    await client.query("DELETE FROM qa.users WHERE id=ANY($1::bigint[])", [userIds]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    cleanupError = e;
  } finally {
    client.release();
    await pool.end();
  }
}

if (cleanupError) throw cleanupError;
