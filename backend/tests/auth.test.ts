import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { HttpError } from "../src/http-error.js";
import type { Repository } from "../src/repositories/repository.js";
import type { AuthProvider } from "../src/models/user.model.js";
import { testAuth, testToken, testCsrf, testUser } from "./auth-double.js";

const repo = {
  health: vi.fn().mockResolvedValue(undefined),
  listProjects: vi.fn(),
  listBugs: vi.fn().mockResolvedValue([]),
  createBug: vi.fn(),
  listCases: vi.fn(),
  createCase: vi.fn(),
  listRuns: vi.fn(),
  createRun: vi.fn(),
  listEvidence: vi.fn(),
  createEvidence: vi.fn(),
} as unknown as Repository;
function setup() {
  const grant = {
    user: testUser,
    csrfToken: testCsrf,
    token: testToken,
    expiresAt: new Date("2030-01-01T00:00:00Z"),
  };
  const auth: AuthProvider = {
    ...testAuth,
    register: vi.fn().mockResolvedValue(grant),
    login: vi.fn().mockResolvedValue(grant),
    logout: vi.fn(),
    updateProfile: vi.fn(async (_userId, input) => ({ ...testUser, ...input })),
    changePassword: vi.fn(),
    listBugTemplates: vi.fn().mockResolvedValue([]),
    createBugTemplate: vi.fn(async (_userId, input) => ({
      id: "7",
      ...input,
      createdAt: "2026-01-01T00:00:00.000Z",
    })),
    updateBugTemplate: vi.fn(async (_userId, templateId, input) => ({
      id: templateId,
      ...input,
      createdAt: "2026-01-01T00:00:00.000Z",
    })),
    deleteBugTemplate: vi.fn(),
    deactivateAccount: vi.fn(),
  };
  return { auth, app: createApp(repo, auth) };
}
beforeEach(() => vi.clearAllMocks());
describe("authentication HTTP boundaries", () => {
  it("creates a cookie session without exposing the token in JSON", async () => {
    const { app } = setup();
    const result = await request(app)
      .post("/api/auth/register")
      .send({ name: "QA", email: testUser.email, password: "a long passphrase" });
    expect(result.status).toBe(201);
    expect(result.body.data).toEqual({ user: testUser, csrfToken: testCsrf });
    expect(result.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(result.headers["set-cookie"][0]).toContain("SameSite=Lax");
    expect(result.headers["set-cookie"][0]).toContain("Path=/api");
    expect(result.text).not.toContain(testToken);
    expect(
      (await request(app).get("/api/auth/me").set("Cookie", `qa_session=${testToken}`)).body.data
        .user,
    ).toEqual(testUser);
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
  });
  it("rejects weak registration input and foreign origins", async () => {
    const { app, auth } = setup();
    expect(
      (
        await request(app)
          .post("/api/auth/register")
          .send({ name: "QA", email: testUser.email, password: "123" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/auth/register")
          .set("Origin", "https://foreign.example")
          .send({ name: "QA", email: testUser.email, password: "a long passphrase" })
      ).status,
    ).toBe(403);
    expect(auth.register).not.toHaveBeenCalled();
  });
  it("does not grant resource access without a valid cookie", async () => {
    const { app } = setup();
    expect((await request(app).get("/api/projects")).status).toBe(401);
    expect((await request(app).get("/api/bugs").set("Authorization", "Bearer fake")).status).toBe(
      401,
    );
    expect(repo.listBugs).not.toHaveBeenCalled();
  });
  it("requires CSRF on writes and logout", async () => {
    const { app, auth } = setup();
    const cookie = `qa_session=${testToken}`;
    expect(
      (
        await request(app)
          .post("/api/bugs")
          .set("Cookie", cookie)
          .send({ projectId: "1", title: "Bug", priority: "Alta" })
      ).body.error.code,
    ).toBe("INVALID_CSRF");
    expect(repo.createBug).not.toHaveBeenCalled();
    expect(
      (await request(app).post("/api/auth/logout").set("Cookie", cookie).send({})).status,
    ).toBe(403);
    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", testCsrf)
      .send({});
    expect(logout.status).toBe(204);
    expect(auth.logout).toHaveBeenCalledWith(testToken);
    expect(logout.headers["set-cookie"][0]).toContain("Expires=Thu, 01 Jan 1970");
  });
  it("updates account details only with a valid session and CSRF token", async () => {
    const { app, auth } = setup();
    const cookie = `qa_session=${testToken}`;
    const body = { name: "Updated QA", email: "updated@example.test" };
    expect((await request(app).patch("/api/auth/me").set("Cookie", cookie).send(body)).status).toBe(
      403,
    );
    expect(auth.updateProfile).not.toHaveBeenCalled();
    const response = await request(app)
      .patch("/api/auth/me")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", testCsrf)
      .send(body);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ ...testUser, ...body });
    expect(auth.updateProfile).toHaveBeenCalledWith(testUser.id, body);
    expect(
      (await request(app).patch("/api/auth/me").set("X-CSRF-Token", testCsrf).send(body)).status,
    ).toBe(401);
  });
  it("changes passwords only with CSRF and validates the new password", async () => {
    const { app, auth } = setup();
    const cookie = `qa_session=${testToken}`;
    expect(
      (
        await request(app)
          .patch("/api/auth/password")
          .set("Cookie", cookie)
          .send({ currentPassword: "old", newPassword: "long new password" })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .patch("/api/auth/password")
          .set("Cookie", cookie)
          .set("X-CSRF-Token", testCsrf)
          .send({ currentPassword: "old", newPassword: "short" })
      ).status,
    ).toBe(400);
    const response = await request(app)
      .patch("/api/auth/password")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", testCsrf)
      .send({ currentPassword: "old", newPassword: "long new password" });
    expect(response.status).toBe(204);
    expect(auth.changePassword).toHaveBeenCalledWith(
      testUser.id,
      "old",
      "long new password",
      testToken,
    );
  });
  it("manages bug templates for the authenticated account and validates input", async () => {
    const { app, auth } = setup();
    const cookie = `qa_session=${testToken}`;
    const body = {
      name: "Bug funcional",
      title: "[Bug] ",
      description: "## Pasos\n\n## Resultado",
      priority: "Alta",
    };
    expect((await request(app).get("/api/auth/bug-templates").set("Cookie", cookie)).status).toBe(
      200,
    );
    expect(auth.listBugTemplates).toHaveBeenCalledWith(testUser.id);
    expect(
      (await request(app).post("/api/auth/bug-templates").set("Cookie", cookie).send(body)).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/auth/bug-templates")
          .set("Cookie", cookie)
          .set("X-CSRF-Token", testCsrf)
          .send({ ...body, priority: "Urgente" })
      ).status,
    ).toBe(400);
    const created = await request(app)
      .post("/api/auth/bug-templates")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", testCsrf)
      .send(body);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      id: "7",
      name: body.name,
      title: "[Bug]",
      priority: body.priority,
    });
    const normalized = { ...body, title: "[Bug]" };
    expect(auth.createBugTemplate).toHaveBeenCalledWith(testUser.id, normalized);
    const updated = await request(app)
      .patch("/api/auth/bug-templates/7")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", testCsrf)
      .send({ ...body, name: "Plantilla editada" });
    expect(updated.status).toBe(200);
    expect(auth.updateBugTemplate).toHaveBeenCalledWith(testUser.id, "7", {
      ...normalized,
      name: "Plantilla editada",
    });
    expect(
      (
        await request(app)
          .delete("/api/auth/bug-templates/7")
          .set("Cookie", cookie)
          .set("X-CSRF-Token", testCsrf)
          .send({})
      ).status,
    ).toBe(204);
    expect(auth.deleteBugTemplate).toHaveBeenCalledWith(testUser.id, "7");
  });
  it("requires CSRF, current password, and an exact confirmation to deactivate an account", async () => {
    const { app, auth } = setup();
    const cookie = `qa_session=${testToken}`;
    const body = { currentPassword: "current password", confirmation: "ELIMINAR CUENTA" };
    expect(
      (await request(app).delete("/api/auth/me").set("Cookie", cookie).send(body)).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .delete("/api/auth/me")
          .set("Cookie", cookie)
          .set("X-CSRF-Token", testCsrf)
          .send({ ...body, confirmation: "delete account" })
      ).status,
    ).toBe(400);
    expect(auth.deactivateAccount).not.toHaveBeenCalled();
    const result = await request(app)
      .delete("/api/auth/me")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", testCsrf)
      .send(body);
    expect(result.status).toBe(204);
    expect(result.headers["set-cookie"][0]).toContain("Expires=Thu, 01 Jan 1970");
    expect(auth.deactivateAccount).toHaveBeenCalledWith(testUser.id, body.currentPassword);
  });
  it("blocks project access across accounts before calling resource operations", async () => {
    const { app } = setup();
    const cookie = `qa_session=${testToken}`;
    expect((await request(app).get("/api/bugs?projectId=2").set("Cookie", cookie)).status).toBe(
      404,
    );
    expect(
      (
        await request(app)
          .post("/api/bugs")
          .set("Cookie", cookie)
          .set("X-CSRF-Token", testCsrf)
          .send({ projectId: "2", title: "Bug", priority: "Alta" })
      ).status,
    ).toBe(404);
    expect(repo.listBugs).not.toHaveBeenCalled();
    expect(repo.createBug).not.toHaveBeenCalled();
    expect((await request(app).get("/api/projects").set("Cookie", cookie)).body.data).toHaveLength(
      1,
    );
  });
  it("returns generic login failure and limits repeated attempts", async () => {
    const { app, auth } = setup();
    vi.mocked(auth.login).mockRejectedValue(
      new HttpError(401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos."),
    );
    for (let i = 0; i < 20; i++)
      expect(
        (
          await request(app)
            .post("/api/auth/login")
            .send({ email: testUser.email, password: "incorrect" })
        ).status,
      ).toBe(401);
    const limited = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: "incorrect" });
    expect(limited.status).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
  });
});
