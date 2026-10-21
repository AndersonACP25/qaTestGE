import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { testAuth, testToken, testCsrf } from "./auth-double.js";
import type { Repository } from "../src/repositories/repository.js";

const repo = {
  health: vi.fn<Repository["health"]>(), listProjects: vi.fn<Repository["listProjects"]>(),
  listBugs: vi.fn<Repository["listBugs"]>(), createBug: vi.fn<Repository["createBug"]>(),
  updateBugStatus: vi.fn<Repository["updateBugStatus"]>(),
  listCases: vi.fn<Repository["listCases"]>(), createCase: vi.fn<Repository["createCase"]>(),
  updateCaseStatus: vi.fn<Repository["updateCaseStatus"]>(),
  listRuns: vi.fn<Repository["listRuns"]>(), createRun: vi.fn<Repository["createRun"]>(),
  listEvidence: vi.fn<Repository["listEvidence"]>(), createEvidence: vi.fn<Repository["createEvidence"]>(),
};
const app = createApp(repo, testAuth);
const signed = () => request.agent(app).set("Cookie", `qa_session=${testToken}`).set("X-CSRF-Token", testCsrf);
const bug = { id: "BUG-001", projectId: "1", title: "Checkout falla", project: "Web Store", description: "", priority: "Alta" as const, status: "Abierto" as const, assignee: null, createdAt: "2026-01-01T00:00:00.000Z" };
beforeEach(() => {
  vi.resetAllMocks();
  repo.health.mockResolvedValue();
  repo.listProjects.mockResolvedValue([{ id: "1", organizationId: "1", name: "Web Store", description: "" }]);
  repo.listBugs.mockResolvedValue([]); repo.listCases.mockResolvedValue([]); repo.listRuns.mockResolvedValue([]); repo.listEvidence.mockResolvedValue([]);
});

describe("qaTestGE API with an injected repository (no database)", () => {
  it("serves SwaggerUI, assets and OpenAPI", async () => {
    expect((await signed().get("/api/openapi.json")).body.openapi).toBe("3.0.3");
    expect((await signed().get("/api/docs/")).text).toContain("swagger-ui");
    expect((await signed().get("/api/docs/swagger-ui.css")).status).toBe(200);
  });
  it("checks database readiness and reports outages without details", async () => {
    expect((await signed().get("/api/health")).body.data).toEqual({ status: "ok", database: "postgresql" });
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
    const input = { projectId: "1", title: bug.title, priority: "Alta" };
    const created = await signed().post("/api/bugs").send(input);
    expect(created.status).toBe(201);
    expect(created.body.data).toEqual(bug);
    expect(repo.createBug).toHaveBeenCalledWith(input);
  });
  it("updates bug and test case statuses only through valid status values", async () => {
    repo.updateBugStatus.mockResolvedValue({ ...bug, status: "En progreso" });
    const changedBug = await signed().patch("/api/bugs/BUG-001/status").send({ projectId: "1", status: "En progreso" });
    expect(changedBug.status).toBe(200);
    expect(changedBug.body.data.status).toBe("En progreso");
    expect(repo.updateBugStatus).toHaveBeenCalledWith("1", "1", "En progreso");
    expect((await signed().patch("/api/bugs/BUG-001/status").send({ projectId: "1", status: "Cerrado" })).status).toBe(400);
    expect((await signed().patch("/api/bugs/INVALID/status").send({ projectId: "1", status: "Resuelto" })).status).toBe(400);

    const testCase = { id: "TC-004", projectId: "1", title: "Acceso", suite: "", status: "Pendiente" as const, createdAt: bug.createdAt, preconditions: "", steps: [] };
    repo.updateCaseStatus.mockResolvedValue({ ...testCase, status: "Aprobado" });
    const changedCase = await signed().patch("/api/test-cases/TC-004/status").send({ projectId: "1", status: "Aprobado" });
    expect(changedCase.status).toBe(200);
    expect(changedCase.body.data.status).toBe("Aprobado");
    expect(repo.updateCaseStatus).toHaveBeenCalledWith("4", "1", "Aprobado");
    expect((await signed().patch("/api/test-cases/TC-004/status").send({ projectId: "1", status: "En curso" })).status).toBe(400);
  });
  it("does not update status when the requested resource is outside the account's projects", async () => {
    repo.updateBugStatus.mockResolvedValue(null);
    const response = await signed().patch("/api/bugs/BUG-999/status").send({ projectId: "1", status: "Resuelto" });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("BUG_NOT_FOUND");
    const forbidden = await signed().patch("/api/bugs/BUG-001/status").send({ projectId: "2", status: "Resuelto" });
    expect(forbidden.status).toBe(404);
    expect(forbidden.body.error.code).toBe("PROJECT_NOT_FOUND");
    expect(repo.updateBugStatus).toHaveBeenCalledTimes(1);
    const forbiddenCase = await signed().patch("/api/test-cases/TC-001/status").send({ projectId: "2", status: "Fallido" });
    expect(forbiddenCase.status).toBe(404);
    expect(repo.updateCaseStatus).not.toHaveBeenCalled();
  });
  it("rejects legacy or invalid inputs before accessing the repository", async () => {
    for (const body of [{ title: "Bug", project: "Web Store", priority: "Alta" }, { title: "Bug", projectId: 1, priority: "Alta" }, { title: " ", projectId: "1", priority: "Urgente" }]) {
      expect((await signed().post("/api/bugs").send(body)).status).toBe(400);
    }
    expect(repo.createBug).not.toHaveBeenCalled();
    expect((await signed().post("/api/test-runs").send({ projectId: "1", title: "Run", owner: "QA", caseCount: 3 })).status).toBe(400);
    expect((await signed().post("/api/test-runs").send({ projectId: "1", title: "Run", owner: "QA", caseIds: ["TC-001", "TC-1"] })).status).toBe(400);
  });
  it("accepts case steps, case references and evidence references", async () => {
    const input = { projectId: "1", title: "Registro", steps: [{ action: "Enviar", expectedResult: "Error" }, { action: "Verificar", expectedResult: "Se muestra el error" }] };
    const tc = { ...input, suite: "", id: "TC-001", preconditions: "", status: "Pendiente" as const, createdAt: bug.createdAt };
    repo.createCase.mockResolvedValue(tc);
    expect((await signed().post("/api/test-cases").send(input)).status).toBe(201);
    expect(repo.createCase).toHaveBeenCalledWith(input);
    repo.createRun.mockResolvedValue({ id: "RUN-001", projectId: "1", title: "Run", owner: "QA", caseIds: [tc.id], caseCount: 1, progress: 0, status: "En curso", createdAt: bug.createdAt });
    expect((await signed().post("/api/test-runs").send({ projectId: "1", title: "Run", owner: "QA", caseIds: [tc.id] })).body.data.caseCount).toBe(1);
    repo.createEvidence.mockResolvedValue({ id: "EVD-001", projectId: "1", name: "file.png", type: "Imagen", sizeBytes: 10, related: [tc.id], createdAt: bug.createdAt });
    expect((await signed().post("/api/evidence").send({ projectId: "1", name: "file.png", type: "Imagen", sizeBytes: 10, related: tc.id })).body.data.related).toEqual([tc.id]);
    expect((await signed().post("/api/evidence").send({ projectId: "1", name: "file.png", type: "Imagen", sizeBytes: 10, related: "bogus" })).status).toBe(400);
  });
  it("accepts an optional suite but still rejects malformed step pairs", async () => {
    const input = { projectId: "1", title: "Caso sin suite" };
    repo.createCase.mockResolvedValue({ ...input, suite: "", preconditions: "", steps: [], id: "TC-002", status: "Pendiente", createdAt: bug.createdAt });
    expect((await signed().post("/api/test-cases").send(input)).status).toBe(201);
    expect(repo.createCase).toHaveBeenCalledWith(input);
    expect((await signed().post("/api/test-cases").send({ ...input, steps: [{ action: "Enviar", expectedResult: "" }] })).status).toBe(400);
    expect((await signed().post("/api/test-cases").send({ ...input, steps: Array.from({ length: 101 }, () => ({ action: "a", expectedResult: "b" })) })).status).toBe(400);
  });
  it("maps constraint failures and network outages without leaking database details", async () => {
    for (const [code, expectedStatus, expectedCode] of [["23503", 400, "INVALID_REFERENCE"], ["23505", 409, "CONFLICT"], ["ECONNREFUSED", 503, "DATABASE_UNAVAILABLE"]] as const) {
      repo.createBug.mockRejectedValueOnce(Object.assign(new Error("secret SQL data"), { code }));
      const response = await signed().post("/api/bugs").send({ projectId: "1", title: "Bug", priority: "Alta" });
      expect(response.status).toBe(expectedStatus); expect(response.body.error.code).toBe(expectedCode); expect(response.text).not.toContain("secret");
    }
  });
  it("returns errors for unknown endpoints and malformed JSON", async () => {
    expect((await signed().get("/api/unknown")).body.error.code).toBe("NOT_FOUND");
    const response = await signed().post("/api/bugs").set("Content-Type", "application/json").send("{invalid");
    expect(response.status).toBe(400); expect(response.body.error.code).toBe("INVALID_JSON");
    expect(repo.createBug).not.toHaveBeenCalled();
  });
});
