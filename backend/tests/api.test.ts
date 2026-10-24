import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { testAuth, testToken, testCsrf } from "./auth-double.js";
import type { Repository } from "../src/repositories/repository.js";

const repo = {
  health: vi.fn<Repository["health"]>(),
  listProjects: vi.fn<Repository["listProjects"]>(),
  listBugs: vi.fn<Repository["listBugs"]>(),
  createBug: vi.fn<Repository["createBug"]>(),
  updateBug: vi.fn<Repository["updateBug"]>(),
  updateBugStatus: vi.fn<Repository["updateBugStatus"]>(),
  listCases: vi.fn<Repository["listCases"]>(),
  createCase: vi.fn<Repository["createCase"]>(),
  updateCaseStatus: vi.fn<Repository["updateCaseStatus"]>(),
  updateCase: vi.fn<Repository["updateCase"]>(),
  deleteCase: vi.fn<Repository["deleteCase"]>(),
  listCaseAttachments: vi.fn<Repository["listCaseAttachments"]>(),
  getCaseAttachment: vi.fn<Repository["getCaseAttachment"]>(),
  createCaseAttachment: vi.fn<Repository["createCaseAttachment"]>(),
  deleteCaseAttachment: vi.fn<Repository["deleteCaseAttachment"]>(),
  listRuns: vi.fn<Repository["listRuns"]>(),
  createRun: vi.fn<Repository["createRun"]>(),
  updateRun: vi.fn<Repository["updateRun"]>(),
  deleteRun: vi.fn<Repository["deleteRun"]>(),
  updateRunResult: vi.fn<Repository["updateRunResult"]>(),
  listEvidence: vi.fn<Repository["listEvidence"]>(),
  createEvidence: vi.fn<Repository["createEvidence"]>(),
  updateEvidence: vi.fn<Repository["updateEvidence"]>(),
  deleteEvidence: vi.fn<Repository["deleteEvidence"]>(),
  saveEvidenceFile: vi.fn<Repository["saveEvidenceFile"]>(),
  getEvidenceFile: vi.fn<Repository["getEvidenceFile"]>(),
  listTags: vi.fn<Repository["listTags"]>(),
  createTag: vi.fn<Repository["createTag"]>(),
  updateTag: vi.fn<Repository["updateTag"]>(),
  deleteTag: vi.fn<Repository["deleteTag"]>(),
};
const app = createApp(repo, testAuth);
const signed = () =>
  request.agent(app).set("Cookie", `qa_session=${testToken}`).set("X-CSRF-Token", testCsrf);
it("edita y elimina ejecuciones y registra resultados con proyecto y validación", async () => {
  const run = {
    id: "RUN-001",
    projectId: "1",
    title: "Regresión",
    owner: "QA",
    caseIds: ["TC-001"],
    caseCount: 1,
    progress: 100,
    status: "En curso" as const,
    createdAt: "2026-01-01Z",
    tagIds: [],
    results: [],
  };
  const input = {
    projectId: "1",
    title: "Regresión",
    owner: "QA",
    caseIds: ["TC-001"],
    status: "En curso",
  };
  repo.updateRun.mockResolvedValue(run);
  expect((await signed().patch("/api/test-runs/RUN-001").send(input)).status).toBe(200);
  expect(repo.updateRun).toHaveBeenCalledWith("1", "1", {
    title: "Regresión",
    owner: "QA",
    caseIds: ["TC-001"],
    status: "En curso",
  });
  expect(
    (
      await signed()
        .patch("/api/test-runs/RUN-001")
        .send({ ...input, status: "Inventado" })
    ).status,
  ).toBe(400);
  expect(
    (
      await signed()
        .patch("/api/test-runs/RUN-001")
        .send({ ...input, caseIds: ["TC-001", "TC-01"] })
    ).status,
  ).toBe(400);
  repo.updateRunResult.mockResolvedValue(run);
  expect(
    (
      await signed()
        .patch("/api/test-runs/RUN-001/results/RES-001")
        .send({ projectId: "1", status: "passed", notes: "Verificado" })
    ).status,
  ).toBe(200);
  expect(repo.updateRunResult).toHaveBeenCalledWith("1", "1", "1", {
    status: "passed",
    notes: "Verificado",
  });
  expect(
    (
      await signed()
        .patch("/api/test-runs/RUN-001/results/RES-001")
        .send({ projectId: "1", status: "other", notes: "" })
    ).status,
  ).toBe(400);
  repo.updateRunResult.mockResolvedValue(null);
  expect(
    (
      await signed()
        .patch("/api/test-runs/RUN-001/results/RES-002")
        .send({ projectId: "1", status: "passed", notes: "" })
    ).status,
  ).toBe(404);
  repo.deleteRun.mockResolvedValue(true);
  expect((await signed().delete("/api/test-runs/RUN-001?projectId=1").send({})).status).toBe(204);
  expect(repo.deleteRun).toHaveBeenCalledWith("1", "1");
  expect((await signed().delete("/api/test-runs/RUN-001").send({})).status).toBe(400);
  expect((await request(app).patch("/api/test-runs/RUN-001").send(input)).status).toBe(401);
  expect(
    (
      await request(app)
        .patch("/api/test-runs/RUN-001")
        .set("Cookie", `qa_session=${testToken}`)
        .send(input)
    ).status,
  ).toBe(403);
});
const bug = {
  id: "BUG-001",
  projectId: "1",
  title: "Checkout falla",
  project: "Web Store",
  description: "",
  priority: "Alta" as const,
  status: "Abierto" as const,
  assignee: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  tagIds: [],
};
beforeEach(() => {
  vi.resetAllMocks();
  repo.health.mockResolvedValue();
  repo.listProjects.mockResolvedValue([
    { id: "1", organizationId: "1", name: "Web Store", description: "" },
  ]);
  repo.listBugs.mockResolvedValue([]);
  repo.listCases.mockResolvedValue([]);
  repo.listRuns.mockResolvedValue([]);
  repo.listEvidence.mockResolvedValue([]);
  repo.listTags.mockResolvedValue([]);
  repo.listCaseAttachments.mockResolvedValue([]);
});
it("manages project tags and validates tag inputs", async () => {
  const tag = {
    id: "7",
    projectId: "1",
    name: "Regresión",
    color: "#7462df",
    createdAt: bug.createdAt,
  };
  repo.listTags.mockResolvedValue([tag]);
  expect((await signed().get("/api/tags?projectId=1")).body.data).toEqual([tag]);
  expect(repo.listTags).toHaveBeenCalledWith("1");
  repo.createTag.mockResolvedValue(tag);
  const input = { projectId: "1", name: tag.name, color: tag.color };
  expect((await signed().post("/api/tags").send(input)).status).toBe(201);
  expect(repo.createTag).toHaveBeenCalledWith(input);
  repo.updateTag.mockResolvedValue({ ...tag, name: "Crítico" });
  expect(
    (
      await signed()
        .patch("/api/tags/7")
        .send({ ...input, name: "Crítico" })
    ).status,
  ).toBe(200);
  expect(repo.updateTag).toHaveBeenCalledWith("7", "1", {
    name: "Crítico",
    color: tag.color,
  });
  repo.deleteTag.mockResolvedValue(true);
  expect((await signed().delete("/api/tags/7?projectId=1").send({})).status).toBe(204);
  expect(repo.deleteTag).toHaveBeenCalledWith("7", "1");
  expect(
    (
      await signed()
        .post("/api/tags")
        .send({ ...input, color: "purple" })
    ).status,
  ).toBe(400);
});

describe("qaTestGE API with an injected repository (no database)", () => {
  it("serves SwaggerUI, assets and OpenAPI", async () => {
    expect((await signed().get("/api/openapi.json")).body.openapi).toBe("3.0.3");
    expect((await signed().get("/api/docs/")).text).toContain("swagger-ui");
    expect((await signed().get("/api/docs/swagger-ui.css")).status).toBe(200);
  });
  it("checks database readiness and reports outages without details", async () => {
    expect((await signed().get("/api/health")).body.data).toEqual({
      status: "ok",
      database: "postgresql",
    });
    repo.health.mockRejectedValueOnce(new Error("sensitive connection details"));
    const unavailable = await signed().get("/api/health");
    expect(unavailable.status).toBe(503);
    expect(unavailable.body.error.code).toBe("DATABASE_UNAVAILABLE");
    expect(unavailable.text).not.toContain("sensitive");
  });
  it("lists projects and forwards project filtering", async () => {
    expect((await signed().get("/api/projects")).body.data[0].id).toBe("1");
    repo.listBugs.mockResolvedValue([bug]);
    expect((await signed().get("/api/bugs?projectId=1")).body.data).toEqual([bug]);
    expect(repo.listBugs).toHaveBeenCalledWith("1");
    expect((await signed().get("/api/bugs?projectId=1%20OR%201=1")).status).toBe(400);
    expect((await signed().get("/api/bugs?projectId=1&projectId=2")).status).toBe(400);
  });
  it("creates a bug using an explicit project ID", async () => {
    repo.createBug.mockResolvedValue(bug);
    const input = { projectId: "1", title: bug.title, priority: "Alta", tagIds: ["7"] };
    const created = await signed().post("/api/bugs").send(input);
    expect(created.status).toBe(201);
    expect(created.body.data).toEqual(bug);
    expect(repo.createBug).toHaveBeenCalledWith(input);
  });
  it("edits bug fields and validates the status", async () => {
    const updated = { ...bug, title: "Checkout corregido", status: "Resuelto" as const };
    repo.updateBug.mockResolvedValue(updated);
    const input = {
      projectId: "1",
      title: updated.title,
      priority: "Alta",
      status: "Resuelto",
      description: "",
      assignee: null,
    };
    const response = await signed().patch("/api/bugs/BUG-001").send(input);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(updated);
    expect(repo.updateBug).toHaveBeenCalledWith("1", "1", {
      title: updated.title,
      priority: "Alta",
      status: "Resuelto",
      description: "",
      assignee: null,
    });
    expect(
      (
        await signed()
          .patch("/api/bugs/BUG-001")
          .send({ ...input, status: "Cerrado" })
      ).status,
    ).toBe(400);
    expect(repo.updateBug).toHaveBeenCalledTimes(1);
  });
  it("updates bug and test case statuses only through valid status values", async () => {
    repo.updateBugStatus.mockResolvedValue({ ...bug, status: "En progreso" });
    const changedBug = await signed()
      .patch("/api/bugs/BUG-001/status")
      .send({ projectId: "1", status: "En progreso" });
    expect(changedBug.status).toBe(200);
    expect(changedBug.body.data.status).toBe("En progreso");
    expect(repo.updateBugStatus).toHaveBeenCalledWith("1", "1", "En progreso");
    expect(
      (await signed().patch("/api/bugs/BUG-001/status").send({ projectId: "1", status: "Cerrado" }))
        .status,
    ).toBe(400);
    expect(
      (
        await signed()
          .patch("/api/bugs/INVALID/status")
          .send({ projectId: "1", status: "Resuelto" })
      ).status,
    ).toBe(400);

    const testCase = {
      id: "TC-004",
      projectId: "1",
      title: "Acceso",
      suite: "",
      status: "Pendiente" as const,
      createdAt: bug.createdAt,
      tagIds: [],
      preconditions: "",
      steps: [],
    };
    repo.updateCaseStatus.mockResolvedValue({ ...testCase, status: "Aprobado" });
    const changedCase = await signed()
      .patch("/api/test-cases/TC-004/status")
      .send({ projectId: "1", status: "Aprobado" });
    expect(changedCase.status).toBe(200);
    expect(changedCase.body.data.status).toBe("Aprobado");
    expect(repo.updateCaseStatus).toHaveBeenCalledWith("4", "1", "Aprobado");
    expect(
      (
        await signed()
          .patch("/api/test-cases/TC-004/status")
          .send({ projectId: "1", status: "En curso" })
      ).status,
    ).toBe(400);
  });
  it("does not update status when the requested resource is outside the account's projects", async () => {
    repo.updateBugStatus.mockResolvedValue(null);
    const response = await signed()
      .patch("/api/bugs/BUG-999/status")
      .send({ projectId: "1", status: "Resuelto" });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("BUG_NOT_FOUND");
    const forbidden = await signed()
      .patch("/api/bugs/BUG-001/status")
      .send({ projectId: "2", status: "Resuelto" });
    expect(forbidden.status).toBe(404);
    expect(forbidden.body.error.code).toBe("PROJECT_NOT_FOUND");
    expect(repo.updateBugStatus).toHaveBeenCalledTimes(1);
    const forbiddenCase = await signed()
      .patch("/api/test-cases/TC-001/status")
      .send({ projectId: "2", status: "Fallido" });
    expect(forbiddenCase.status).toBe(404);
    expect(repo.updateCaseStatus).not.toHaveBeenCalled();
  });
  it("rejects legacy or invalid inputs before accessing the repository", async () => {
    for (const body of [
      { title: "Bug", project: "Web Store", priority: "Alta" },
      { title: "Bug", projectId: 1, priority: "Alta" },
      { title: " ", projectId: "1", priority: "Urgente" },
    ]) {
      expect((await signed().post("/api/bugs").send(body)).status).toBe(400);
    }
    expect(repo.createBug).not.toHaveBeenCalled();
    expect(
      (
        await signed()
          .post("/api/test-runs")
          .send({ projectId: "1", title: "Run", owner: "QA", caseCount: 3 })
      ).status,
    ).toBe(400);
    expect(
      (
        await signed()
          .post("/api/test-runs")
          .send({ projectId: "1", title: "Run", owner: "QA", caseIds: ["TC-001", "TC-1"] })
      ).status,
    ).toBe(400);
    expect(
      (
        await signed()
          .post("/api/bugs")
          .send({ projectId: "1", title: "Bug", priority: "Alta", tagIds: ["1", "1"] })
      ).status,
    ).toBe(400);
  });
  it("accepts case steps, case references and evidence references", async () => {
    const input = {
      projectId: "1",
      title: "Registro",
      tagIds: ["7"],
      steps: [
        { action: "Enviar", expectedResult: "Error" },
        { action: "Verificar", expectedResult: "Se muestra el error" },
      ],
    };
    const tc = {
      ...input,
      suite: "",
      id: "TC-001",
      preconditions: "",
      status: "Pendiente" as const,
      createdAt: bug.createdAt,
      tagIds: [],
    };
    repo.createCase.mockResolvedValue(tc);
    expect((await signed().post("/api/test-cases").send(input)).status).toBe(201);
    expect(repo.createCase).toHaveBeenCalledWith(input);
    repo.createRun.mockResolvedValue({
      id: "RUN-001",
      projectId: "1",
      title: "Run",
      owner: "QA",
      caseIds: [tc.id],
      caseCount: 1,
      progress: 0,
      status: "En curso",
      createdAt: bug.createdAt,
      tagIds: [],
    });
    expect(
      (
        await signed()
          .post("/api/test-runs")
          .send({ projectId: "1", title: "Run", owner: "QA", caseIds: [tc.id], tagIds: ["7"] })
      ).body.data.caseCount,
    ).toBe(1);
    repo.createEvidence.mockResolvedValue({
      id: "EVD-001",
      projectId: "1",
      name: "file.png",
      type: "Imagen",
      sizeBytes: 10,
      hasFile: false,
      related: [tc.id],
      createdAt: bug.createdAt,
    });
    expect(
      (
        await signed()
          .post("/api/evidence")
          .send({ projectId: "1", name: "file.png", type: "Imagen", sizeBytes: 10, related: tc.id })
      ).body.data.related,
    ).toEqual([tc.id]);
    expect(
      (
        await signed().post("/api/evidence").send({
          projectId: "1",
          name: "file.png",
          type: "Imagen",
          sizeBytes: 10,
          related: "bogus",
        })
      ).status,
    ).toBe(400);
  });
  it("updates and deletes evidence metadata using the project boundary", async () => {
    const current = {
      id: "EVD-001",
      projectId: "1",
      name: "file.png",
      type: "Imagen" as const,
      sizeBytes: 10,
      hasFile: false,
      related: [bug.id],
      createdAt: bug.createdAt,
    };
    const input = {
      projectId: "1",
      name: "renamed.png",
      type: "Imagen",
      sizeBytes: 20,
      related: bug.id,
    };
    repo.updateEvidence.mockResolvedValue({ ...current, ...input, related: [bug.id] });
    const updated = await signed().patch("/api/evidence/EVD-001").send(input);
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe("renamed.png");
    expect(repo.updateEvidence).toHaveBeenCalledWith("1", "1", {
      name: "renamed.png",
      type: "Imagen",
      sizeBytes: 20,
      related: bug.id,
    });
    expect(
      (
        await signed()
          .patch("/api/evidence/EVD-001")
          .send({ ...input, related: "invalid" })
      ).status,
    ).toBe(400);
    expect(repo.updateEvidence).toHaveBeenCalledTimes(1);

    repo.deleteEvidence.mockResolvedValue(true);
    expect((await signed().delete("/api/evidence/EVD-001?projectId=1").send({})).status).toBe(204);
    expect(repo.deleteEvidence).toHaveBeenCalledWith("1", "1");
    repo.deleteEvidence.mockResolvedValueOnce(false);
    expect((await signed().delete("/api/evidence/EVD-001?projectId=1").send({})).status).toBe(404);
    expect((await signed().delete("/api/evidence/EVD-001").send({})).status).toBe(400);
  });
  it("uploads private evidence files and requires a stored file for download", async () => {
    const evidence = {
      id: "EVD-001",
      projectId: "1",
      name: "capture.bin",
      type: "Archivo" as const,
      sizeBytes: 4,
      hasFile: true,
      related: [],
      createdAt: bug.createdAt,
    };
    const bytes = Buffer.from([0, 1, 2, 3]);
    repo.saveEvidenceFile.mockResolvedValue(evidence);
    const uploaded = await signed()
      .post("/api/evidence/upload?projectId=1&name=capture.bin")
      .set("Content-Type", "application/octet-stream")
      .send(bytes);
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.data.hasFile).toBe(true);
    expect(repo.saveEvidenceFile).toHaveBeenCalledWith(
      null,
      "1",
      { name: "capture.bin", mediaType: "application/octet-stream", fileData: bytes },
      null,
    );
    repo.getEvidenceFile.mockResolvedValue({
      name: evidence.name,
      mediaType: "application/octet-stream",
      fileData: bytes,
      sizeBytes: bytes.length,
    });
    const downloaded = await signed().get("/api/evidence/EVD-001/file?projectId=1");
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers["content-disposition"]).toContain("attachment");
    expect(downloaded.headers["x-content-type-options"]).toBe("nosniff");
    expect(repo.getEvidenceFile).toHaveBeenCalledWith("1", "1");
    repo.getEvidenceFile.mockResolvedValueOnce(null);
    expect((await signed().get("/api/evidence/EVD-002/file?projectId=1")).status).toBe(404);
  });
  it("accepts an optional suite but still rejects malformed step pairs", async () => {
    const input = { projectId: "1", title: "Caso sin suite" };
    repo.createCase.mockResolvedValue({
      ...input,
      suite: "",
      preconditions: "",
      steps: [],
      tagIds: [],
      id: "TC-002",
      status: "Pendiente",
      createdAt: bug.createdAt,
    });
    expect((await signed().post("/api/test-cases").send(input)).status).toBe(201);
    expect(repo.createCase).toHaveBeenCalledWith(input);
    expect(
      (
        await signed()
          .post("/api/test-cases")
          .send({ ...input, steps: [{ action: "Enviar", expectedResult: "" }] })
      ).status,
    ).toBe(400);
    expect(
      (
        await signed()
          .post("/api/test-cases")
          .send({
            ...input,
            steps: Array.from({ length: 101 }, () => ({ action: "a", expectedResult: "b" })),
          })
      ).status,
    ).toBe(400);
  });
  it("edits and deletes saved test cases within the authorized project", async () => {
    const testCase = {
      id: "TC-2",
      projectId: "1",
      title: "Caso editado",
      suite: "Regresión",
      preconditions: "Sesión iniciada",
      steps: [{ action: "Enviar", expectedResult: "Se guarda" }],
      status: "Pendiente" as const,
      createdAt: bug.createdAt,
    };
    const input = {
      projectId: "1",
      title: testCase.title,
      suite: testCase.suite,
      preconditions: testCase.preconditions,
      steps: testCase.steps,
    };
    repo.updateCase.mockResolvedValue(testCase);
    const updated = await signed().patch("/api/test-cases/TC-2").send(input);
    expect(updated.status).toBe(200);
    expect(updated.body.data).toEqual(testCase);
    expect(repo.updateCase).toHaveBeenCalledWith("2", "1", {
      title: input.title,
      suite: input.suite,
      preconditions: input.preconditions,
      steps: input.steps,
    });
    expect(
      (
        await signed()
          .patch("/api/test-cases/TC-2")
          .send({ ...input, projectId: "2" })
      ).status,
    ).toBe(404);
    expect(repo.updateCase).toHaveBeenCalledTimes(1);
    repo.deleteCase.mockResolvedValue(true);
    expect((await signed().delete("/api/test-cases/TC-2?projectId=1").send({})).status).toBe(204);
    expect(repo.deleteCase).toHaveBeenCalledWith("2", "1");
    repo.deleteCase.mockResolvedValue(false);
    expect((await signed().delete("/api/test-cases/TC-2?projectId=1").send({})).status).toBe(404);
  });
  it("validates links and persists case attachments only within authorized projects", async () => {
    const attachment = {
      id: "TCA-1",
      projectId: "1",
      testCaseId: "TC-1",
      kind: "link" as const,
      name: "Docs",
      url: "https://example.com/docs",
      mediaType: null,
      createdAt: bug.createdAt,
    };
    repo.createCaseAttachment.mockResolvedValue(attachment);
    const created = await signed()
      .post("/api/test-cases/TC-1/attachments")
      .send({ projectId: "1", name: "Docs", url: attachment.url });
    expect(created.status).toBe(201);
    expect(repo.createCaseAttachment).toHaveBeenCalledWith({
      projectId: "1",
      testCaseId: "1",
      kind: "link",
      name: "Docs",
      url: attachment.url,
    });
    for (const url of [
      "javascript:alert(1)",
      "https://user:pass@example.com",
      "ftp://example.com",
    ]) {
      expect(
        (
          await signed()
            .post("/api/test-cases/TC-1/attachments")
            .send({ projectId: "1", name: "Invalid", url })
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await signed()
          .post("/api/test-cases/TC-1/attachments")
          .send({ projectId: "2", name: "Docs", url: attachment.url })
      ).status,
    ).toBe(404);
    repo.listCaseAttachments.mockResolvedValue([attachment]);
    expect((await signed().get("/api/test-cases/TC-1/attachments?projectId=1")).body.data).toEqual([
      attachment,
    ]);
    expect((await signed().get("/api/test-cases/TC-1/attachments?projectId=2")).status).toBe(404);
  });
  it("validates uploaded image signatures and serves private image bytes with safe headers", async () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    const attachment = {
      id: "TCA-1",
      projectId: "1",
      testCaseId: "TC-1",
      kind: "image" as const,
      name: "test.png",
      url: null,
      mediaType: "image/png",
      createdAt: bug.createdAt,
    };
    repo.createCaseAttachment.mockResolvedValue(attachment);
    const uploaded = await signed()
      .post("/api/test-cases/TC-1/attachments/image?projectId=1&name=test.png")
      .set("Content-Type", "image/png")
      .send(png);
    expect(uploaded.status).toBe(201);
    expect(repo.createCaseAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "image", mediaType: "image/png", imageData: png }),
    );
    expect(
      (
        await signed()
          .post("/api/test-cases/TC-1/attachments/image?projectId=1&name=test.png")
          .set("Content-Type", "image/png")
          .send(Buffer.from("<svg/>"))
      ).status,
    ).toBe(400);
    expect(
      (
        await signed()
          .post("/api/test-cases/TC-1/attachments/image?projectId=1&name=test.png")
          .set("Content-Type", "image/jpeg")
          .send(png)
      ).status,
    ).toBe(400);
    repo.getCaseAttachment.mockResolvedValue({ ...attachment, imageData: png });
    const image = await signed().get("/api/test-cases/TC-1/attachments/TCA-1/image?projectId=1");
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toContain("image/png");
    expect(image.headers["x-content-type-options"]).toBe("nosniff");
    expect(image.headers["cache-control"]).toContain("no-store");
    expect(image.body).toEqual(png);
    repo.deleteCaseAttachment.mockResolvedValue(true);
    expect(
      (await signed().delete("/api/test-cases/TC-1/attachments/TCA-1?projectId=1").send({})).status,
    ).toBe(204);
    expect(repo.deleteCaseAttachment).toHaveBeenCalledWith("1", "1", "1");
  });
  it("maps constraint failures and network outages without leaking database details", async () => {
    for (const [code, expectedStatus, expectedCode] of [
      ["23503", 400, "INVALID_REFERENCE"],
      ["23505", 409, "CONFLICT"],
      ["ECONNREFUSED", 503, "DATABASE_UNAVAILABLE"],
    ] as const) {
      repo.createBug.mockRejectedValueOnce(Object.assign(new Error("secret SQL data"), { code }));
      const response = await signed()
        .post("/api/bugs")
        .send({ projectId: "1", title: "Bug", priority: "Alta" });
      expect(response.status).toBe(expectedStatus);
      expect(response.body.error.code).toBe(expectedCode);
      expect(response.text).not.toContain("secret");
    }
  });
  it("returns errors for unknown endpoints and malformed JSON", async () => {
    expect((await signed().get("/api/unknown")).body.error.code).toBe("NOT_FOUND");
    const response = await signed()
      .post("/api/bugs")
      .set("Content-Type", "application/json")
      .send("{invalid");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
    expect(repo.createBug).not.toHaveBeenCalled();
  });
});
