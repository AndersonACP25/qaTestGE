import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { HttpError } from "../src/http-error.js";
import type { Repository } from "../src/repositories/repository.js";
import type { AuthProvider } from "../src/auth/auth.js";
import { testAuth, testToken, testCsrf, testUser } from "./auth-double.js";

const repo = {
  health: vi.fn().mockResolvedValue(undefined), listProjects: vi.fn(), listBugs: vi.fn().mockResolvedValue([]),
  createBug: vi.fn(), listCases: vi.fn(), createCase: vi.fn(), listRuns: vi.fn(), createRun: vi.fn(), listEvidence: vi.fn(), createEvidence: vi.fn(),
} as unknown as Repository;
function setup() {
  const grant = { user: testUser, csrfToken: testCsrf, token: testToken, expiresAt: new Date("2030-01-01T00:00:00Z") };
  const auth: AuthProvider = { ...testAuth, register: vi.fn().mockResolvedValue(grant), login: vi.fn().mockResolvedValue(grant), logout: vi.fn() };
  return { auth, app: createApp(repo, auth) };
}
beforeEach(() => vi.clearAllMocks());
describe("authentication HTTP boundaries", () => {
  it("creates a cookie session without exposing the token in JSON", async () => {
    const { app } = setup();
    const result = await request(app).post("/api/auth/register").send({ name: "QA", email: testUser.email, password: "a long passphrase" });
    expect(result.status).toBe(201);
    expect(result.body.data).toEqual({ user: testUser, csrfToken: testCsrf });
    expect(result.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(result.headers["set-cookie"][0]).toContain("SameSite=Lax");
    expect(result.headers["set-cookie"][0]).toContain("Path=/api");
    expect(result.text).not.toContain(testToken);
    expect((await request(app).get("/api/auth/me").set("Cookie", `qa_session=${testToken}`)).body.data.user).toEqual(testUser);
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
  });
  it("rejects weak registration input and foreign origins", async () => {
    const { app, auth } = setup();
    expect((await request(app).post("/api/auth/register").send({ name: "QA", email: testUser.email, password: "123" })).status).toBe(400);
    expect((await request(app).post("/api/auth/register").set("Origin", "https://foreign.example").send({ name: "QA", email: testUser.email, password: "a long passphrase" })).status).toBe(403);
    expect(auth.register).not.toHaveBeenCalled();
  });
  it("does not grant resource access without a valid cookie", async () => {
    const { app } = setup();
    expect((await request(app).get("/api/projects")).status).toBe(401);
    expect((await request(app).get("/api/bugs").set("Authorization", "Bearer fake")).status).toBe(401);
    expect(repo.listBugs).not.toHaveBeenCalled();
  });
  it("requires CSRF on writes and logout", async () => {
    const { app, auth } = setup();
    const cookie = `qa_session=${testToken}`;
    expect((await request(app).post("/api/bugs").set("Cookie", cookie).send({ projectId: "1", title: "Bug", priority: "Alta" })).body.error.code).toBe("INVALID_CSRF");
    expect(repo.createBug).not.toHaveBeenCalled();
    expect((await request(app).post("/api/auth/logout").set("Cookie", cookie).send({})).status).toBe(403);
    const logout = await request(app).post("/api/auth/logout").set("Cookie", cookie).set("X-CSRF-Token", testCsrf).send({});
    expect(logout.status).toBe(204);
    expect(auth.logout).toHaveBeenCalledWith(testToken);
    expect(logout.headers["set-cookie"][0]).toContain("Expires=Thu, 01 Jan 1970");
  });
  it("blocks project access across accounts before calling resource operations", async () => {
    const { app } = setup();
    const cookie = `qa_session=${testToken}`;
    expect((await request(app).get("/api/bugs?projectId=2").set("Cookie", cookie)).status).toBe(404);
    expect((await request(app).post("/api/bugs").set("Cookie", cookie).set("X-CSRF-Token", testCsrf).send({ projectId: "2", title: "Bug", priority: "Alta" })).status).toBe(404);
    expect(repo.listBugs).not.toHaveBeenCalled(); expect(repo.createBug).not.toHaveBeenCalled();
    expect((await request(app).get("/api/projects").set("Cookie", cookie)).body.data).toHaveLength(1);
  });
  it("returns generic login failure and limits repeated attempts", async () => {
    const { app, auth } = setup();
    vi.mocked(auth.login).mockRejectedValue(new HttpError(401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos."));
    for (let i = 0; i < 20; i++) expect((await request(app).post("/api/auth/login").send({ email: testUser.email, password: "incorrect" })).status).toBe(401);
    const limited = await request(app).post("/api/auth/login").send({ email: testUser.email, password: "incorrect" });
    expect(limited.status).toBe(429); expect(limited.headers["retry-after"]).toBeDefined();
  });
});
