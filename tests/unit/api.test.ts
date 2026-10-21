import { afterEach, describe, expect, it, vi } from "vitest";
import { api, deleteEvidence, setCsrfToken, toRun, toEvidence, updateBug, updateEvidence } from "../../src/api";

afterEach(() => {
  vi.unstubAllGlobals();
  setCsrfToken("");
});
describe("frontend API client without network", () => {
  it("sends cookies and CSRF in a JSON mutation, without tokens in storage", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { id: "BUG-001" } }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetch);
    setCsrfToken("test-csrf");
    expect(await api("/bugs", { method: "POST", body: JSON.stringify({ title: "Bug" }) })).toEqual({
      id: "BUG-001",
    });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("/api/bugs");
    expect(options.credentials).toBe("include");
    expect(options.headers.get("X-CSRF-Token")).toBe("test-csrf");
    expect(options.headers.get("Content-Type")).toBe("application/json");
  });
  it("signals session expiry and reports server messages", async () => {
    const target = new EventTarget();
    const expired = vi.fn();
    target.addEventListener("qa:unauthorized", expired);
    vi.stubGlobal("window", target);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { message: "Sesión expirada", code: "UNAUTHENTICATED" } }),
            { status: 401 },
          ),
        ),
    );
    await expect(api("/projects")).rejects.toMatchObject({
      status: 401,
      message: "Sesión expirada",
    });
    expect(expired).toHaveBeenCalledOnce();
  });
  it("does not expire the session when an authenticated action rejects credentials", async () => {
    const target = new EventTarget();
    const expired = vi.fn();
    target.addEventListener("qa:unauthorized", expired);
    vi.stubGlobal("window", target);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { message: "Contraseña actual incorrecta", code: "INVALID_PASSWORD" },
          }),
          { status: 401 },
        ),
      ),
    );
    await expect(
      api("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: "wrong", newPassword: "new long password" }),
      }),
    ).rejects.toMatchObject({ status: 401, code: "INVALID_PASSWORD" });
    expect(expired).not.toHaveBeenCalled();
  });
  it("does not replace failed network requests with example data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(api("/projects")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
  it("maps persisted quantities and reference arrays for the tables", () => {
    expect(
      toRun({
        id: "RUN-001",
        projectId: "1",
        title: "Run",
        owner: "QA",
        caseIds: ["TC-001"],
        caseCount: 1,
        progress: 0,
        status: "En curso",
        createdAt: "2026-01-01T00:00:00Z",
      }).cases,
    ).toBe("1 caso");
    expect(
      toEvidence({
        id: "EVD-001",
        projectId: "1",
        name: "file",
        type: "Archivo",
        sizeBytes: 1024,
        related: ["BUG-001", "RUN-001"],
        createdAt: "2026-01-01T00:00:00Z",
      }).related,
    ).toBe("BUG-001, RUN-001");
  });
  it("uses project-scoped mutation routes for bugs and evidence", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "BUG-001", projectId: "1", title: "Bug", description: "", project: "QA", priority: "Alta", status: "Resuelto", assignee: null, createdAt: "2026-01-01T00:00:00Z" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "EVD-001", projectId: "1", name: "capture.png", type: "Imagen", sizeBytes: 42, related: ["BUG-001"], createdAt: "2026-01-01T00:00:00Z" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await updateBug("BUG-001", "1", { title: "Bug", priority: "Alta", status: "Resuelto" });
    await updateEvidence("EVD-001", "1", { name: "capture.png", type: "Imagen", sizeBytes: 42, related: "BUG-001" });
    await deleteEvidence("EVD-001", "1");
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ["/api/bugs/BUG-001", "PATCH"],
      ["/api/evidence/EVD-001", "PATCH"],
      ["/api/evidence/EVD-001?projectId=1", "DELETE"],
    ]);
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({});
  });
});
