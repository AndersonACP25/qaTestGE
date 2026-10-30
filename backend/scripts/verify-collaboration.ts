// Real PostgreSQL integration: explicitly selected ephemeral DB only; never loads .env.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createPool } from "../src/database.js";
import { createApp } from "../src/app.js";
import { PostgresRepository } from "../src/repositories/postgres.repository.js";
import { PostgresAuth } from "../src/auth/auth.js";
if (!process.env.TEST_DATABASE_URL)
  throw new Error("Define TEST_DATABASE_URL para PostgreSQL efímero.");
const pool = createPool(process.env.TEST_DATABASE_URL);
const app = createApp(new PostgresRepository(pool), new PostgresAuth(pool));
const owner = request.agent(app),
  qa = request.agent(app),
  dev = request.agent(app),
  viewer = request.agent(app),
  outsider = request.agent(app);
const users: string[] = [];
const orgs: string[] = [];
let cleanupError: unknown;
try {
  for (const agent of [owner, qa, dev, viewer, outsider]) {
    const r = await agent.post("/api/auth/register").send({
      name: `QA ${users.length}`,
      email: `${randomUUID()}@example.test`,
      password: "temporary collaboration password",
    });
    assert.equal(r.status, 201);
    agent.set("X-CSRF-Token", r.body.data.csrfToken);
    users.push(r.body.data.user.id);
    orgs.push((await agent.get("/api/projects")).body.data[0].organizationId);
  }
  const projectId = (await owner.get("/api/projects")).body.data[0].id;
  const other = (await outsider.get("/api/projects")).body.data[0].id;
  for (const id of users.slice(1, 4))
    await pool.query("INSERT INTO qa.organization_members(organization_id,user_id) VALUES($1,$2)", [
      orgs[0],
      id,
    ]);
  assert.equal((await qa.get("/api/bugs").query({ projectId })).status, 404);
  for (const [id, role] of [
    [users[1], "QA"],
    [users[2], "Dev"],
    [users[3], "Solo lectura"],
  ])
    assert.equal(
      (
        await owner
          .put(`/api/project-members/${id}`)
          .query({ projectId })
          .send({ role, revision: 0 })
      ).status,
      204,
    );
  assert.equal(
    (
      await owner
        .put(`/api/project-members/${users[0]}`)
        .query({ projectId })
        .send({ role: null, revision: 0 })
    ).status,
    409,
  );
  assert.equal(
    (
      await qa
        .put(`/api/project-members/${users[2]}`)
        .query({ projectId })
        .send({ role: "Admin", revision: 1 })
    ).status,
    403,
  );
  assert.equal(
    (
      await owner
        .put(`/api/project-members/${users[4]}`)
        .query({ projectId })
        .send({ role: "QA", revision: 0 })
    ).status,
    404,
  );
  assert.equal(
    (await qa.get("/api/projects")).body.data.find((p: { id: string }) => p.id === projectId).role,
    "QA",
  );
  const bugInput = { projectId, title: "Bug compartido", priority: "Media" };
  const bug = await dev.post("/api/bugs").send(bugInput);
  assert.equal(bug.status, 201);
  const bugId = bug.body.data.id;
  assert.equal((await viewer.post("/api/bugs").send(bugInput)).status, 403);
  assert.equal(
    (await dev.post("/api/test-cases").send({ projectId, title: "No permitido" })).status,
    403,
  );
  const tc = await qa.post("/api/test-cases").send({
    projectId,
    title: "Caso compartido",
    testType: "API",
    steps: [{ action: "Enviar", expectedResult: "Validar" }],
  });
  assert.equal(tc.status, 201);
  const run = await qa
    .post("/api/test-runs")
    .send({ projectId, title: "Ciclo", owner: "QA", caseIds: [tc.body.data.id] });
  assert.equal(run.status, 201);
  assert.equal(
    (
      await dev
        .patch(`/api/test-runs/${run.body.data.id}/results/${run.body.data.results[0].id}`)
        .send({ projectId, status: "passed", notes: "No permitido" })
    ).status,
    403,
  );
  const workflow = (await owner.get("/api/bug-workflow").query({ projectId })).body.data;
  assert.equal((await qa.put("/api/bug-workflow").query({ projectId }).send(workflow)).status, 403);
  const target = { kind: "bug", id: bugId };
  const key = randomUUID();
  const commentBody = { target, body: `Revisar @[Dev](user:${users[2]})` };
  const comment = await qa
    .post("/api/comments")
    .query({ projectId })
    .set("Idempotency-Key", key)
    .send(commentBody);
  assert.equal(comment.status, 201);
  assert.equal(comment.body.data.authorId, users[1]);
  assert.equal(comment.body.data.mentions[0].id, users[2]);
  const replay = await qa
    .post("/api/comments")
    .query({ projectId })
    .set("Idempotency-Key", key)
    .send(commentBody);
  assert.equal(replay.body.data.id, comment.body.data.id);
  assert.equal(
    (
      await qa
        .post("/api/comments")
        .query({ projectId })
        .set("Idempotency-Key", key)
        .send({ ...commentBody, body: "Diferente" })
    ).status,
    409,
  );
  assert.equal(
    (
      await viewer
        .post("/api/comments")
        .query({ projectId })
        .set("Idempotency-Key", randomUUID())
        .send(commentBody)
    ).status,
    403,
  );
  assert.equal(
    (
      await qa
        .post("/api/comments")
        .query({ projectId })
        .set("Idempotency-Key", randomUUID())
        .send({ ...commentBody, body: `@[Ajeno](user:${users[4]})` })
    ).status,
    400,
  );
  assert.equal(
    (
      await qa
        .post("/api/comments")
        .query({ projectId })
        .set("Idempotency-Key", randomUUID())
        .send({ target: { kind: "case", id: tc.body.data.id }, body: "Comentario del caso" })
    ).status,
    201,
  );
  assert.equal(
    (
      await dev
        .post("/api/comments")
        .query({ projectId })
        .set("Idempotency-Key", randomUUID())
        .send({ target: { kind: "run", id: run.body.data.id }, body: "Comentario de ejecución" })
    ).status,
    201,
  );
  const listed = await viewer
    .get("/api/comments")
    .query({ projectId, kind: "bug", resourceId: bugId });
  assert.equal(listed.status, 200);
  assert.equal(listed.body.data.length, 1);
  assert.equal(
    (
      await dev
        .patch(`/api/comments/${comment.body.data.id}`)
        .query({ projectId })
        .send({ body: "Usurpar", version: 1 })
    ).status,
    403,
  );
  const edits = await Promise.all(
    ["Primero", "Segundo"].map((body) =>
      qa
        .patch(`/api/comments/${comment.body.data.id}`)
        .query({ projectId })
        .send({ body: `${body} @[Dev](user:${users[2]})`, version: 1 }),
    ),
  );
  assert.deepEqual(edits.map((r) => r.status).sort(), [200, 409]);
  const notifications = await dev.get("/api/mention-notifications").query({ projectId });
  assert.equal(notifications.status, 200);
  assert.equal(notifications.body.data.length, 1);
  const notificationId = notifications.body.data[0].id;
  assert.equal(
    (
      await viewer
        .patch(`/api/mention-notifications/${notificationId}`)
        .query({ projectId })
        .send({})
    ).status,
    404,
  );
  assert.equal(
    (await dev.patch(`/api/mention-notifications/${notificationId}`).query({ projectId }).send({}))
      .status,
    204,
  );
  assert.ok((await dev.get("/api/mention-notifications").query({ projectId })).body.data[0].readAt);
  assert.equal((await owner.get("/api/activity").query({ projectId: other })).status, 404);
  assert.equal(
    (await outsider.get("/api/comments").query({ projectId, kind: "bug", resourceId: bugId }))
      .status,
    404,
  );
  assert.equal(
    (
      await owner
        .delete(`/api/comments/${comment.body.data.id}`)
        .query({ projectId })
        .send({ version: 2 })
    ).status,
    200,
  );
  assert.equal(
    (await dev.get("/api/mention-notifications").query({ projectId })).body.data.length,
    0,
  );
  const events = await owner
    .get("/api/activity")
    .query({ projectId, kind: "bug", resourceId: bugId });
  assert.equal(events.status, 200);
  assert.ok(
    events.body.data.some(
      (a: { action: string; actorId: string }) =>
        a.action === "comments.insert" && a.actorId === users[1],
    ),
  );
  assert.ok(events.body.data.some((a: { action: string }) => a.action === "comments.update"));
  assert.equal(
    events.body.data.filter((a: { action: string }) => a.action === "comments.insert").length,
    1,
  );
  assert.ok(!JSON.stringify(events.body.data).includes("request_hash"));
  assert.ok(!JSON.stringify(events.body.data).includes("request_key"));
  const requestEvent = events.body.data.find(
    (a: { action: string }) => a.action === "comments.insert",
  );
  assert.equal(requestEvent.requestId, comment.headers["x-request-id"]);
  await assert.rejects(
    pool.query("UPDATE qa.activity SET action='forged' WHERE project_id=$1", [projectId]),
    (e: { code: string }) => e.code === "42501",
  );
  const before = (
    await pool.query("SELECT count(*)::int AS n FROM qa.activity WHERE project_id=$1", [projectId])
  ).rows[0].n;
  await qa
    .post("/api/comments")
    .query({ projectId })
    .set("Idempotency-Key", randomUUID())
    .send({ ...commentBody, body: `@[Inválido](user:${users[4]})` });
  assert.equal(
    (
      await pool.query("SELECT count(*)::int AS n FROM qa.activity WHERE project_id=$1", [
        projectId,
      ])
    ).rows[0].n,
    before,
  );
  const access = (await owner.get("/api/project-members").query({ projectId, candidates: true }))
    .body.data;
  const devRow = access.find((x: { id: string }) => x.id === users[2]);
  assert.equal(
    (
      await owner
        .put(`/api/project-members/${users[2]}`)
        .query({ projectId })
        .send({ role: null, revision: devRow.revision })
    ).status,
    204,
  );
  assert.equal(
    (await dev.get("/api/comments").query({ projectId, kind: "bug", resourceId: bugId })).status,
    404,
  );
  assert.equal((await dev.get("/api/mention-notifications").query({ projectId })).status, 404);
  assert.equal(
    (
      await owner
        .put(`/api/project-members/${users[2]}`)
        .query({ projectId })
        .send({ role: "Dev", revision: devRow.revision })
    ).status,
    409,
  );
  // Context cannot leak across pooled connections or users.
  const raw = await pool.query("SELECT NULLIF(current_setting('qa.actor_id',true),'') AS actor");
  assert.equal(raw.rows[0].actor, null);
  const binary = Buffer.from("private-evidence-collaboration-test");
  const file = await owner
    .post(`/api/evidence/upload?projectId=${projectId}&name=evidence.bin`)
    .set("Content-Type", "application/octet-stream")
    .send(binary);
  assert.equal(file.status, 201);
  const fileEvents = (await owner.get("/api/activity").query({ projectId })).body.data;
  assert.ok(fileEvents.some((e: { action: string }) => e.action === "evidence.insert"));
  assert.ok(!JSON.stringify(fileEvents).includes("file_bytes"));
  assert.ok(!JSON.stringify(fileEvents).includes(binary.toString("hex")));
  const qaAccess = (
    await owner.get("/api/project-members").query({ projectId, candidates: true })
  ).body.data.find((m: { id: string }) => m.id === users[1]);
  assert.equal(
    (
      await owner
        .put(`/api/project-members/${users[1]}`)
        .query({ projectId })
        .send({ role: "Admin", revision: qaAccess.revision })
    ).status,
    204,
  );
  await pool.query("UPDATE qa.users SET is_active=false WHERE id=$1", [users[0]]);
  assert.equal(
    (
      await qa
        .put(`/api/project-members/${users[1]}`)
        .query({ projectId })
        .send({ role: "Solo lectura", revision: qaAccess.revision + 1 })
    ).status,
    409,
  );
  await pool.query("UPDATE qa.users SET is_active=true WHERE id=$1", [users[0]]);
  console.info(
    "Colaboración: roles, denegaciones, aislamiento, comentarios/menciones, avisos privados, idempotencia, conflictos, revocación, auditoría inmutable y rollback correctos.",
  );
} finally {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const table of [
      "comments",
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
    ]) {
      await c.query(
        `DELETE FROM qa.${table} WHERE project_id IN (SELECT id FROM qa.projects WHERE organization_id=ANY($1::bigint[]))`,
        [orgs],
      );
    }
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
