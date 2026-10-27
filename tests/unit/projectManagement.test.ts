import { describe, expect, it, vi } from "vitest";
import { PostgresAuth } from "../../backend/src/auth/auth";

describe("project ownership boundaries", () => {
  it("limits update and deletion to owners and hides unavailable projects", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const auth = new PostgresAuth({ query } as unknown as ConstructorParameters<
      typeof PostgresAuth
    >[0]);
    await expect(auth.updateProject("8", "19", "Proyecto", "")).rejects.toMatchObject({
      status: 404,
    });
    expect(query.mock.calls[0][0]).toContain("m.role='owner'");
    expect(query.mock.calls[0][1]).toEqual(["8", "19", "Proyecto", ""]);
    await expect(auth.deleteProject("8", "19")).rejects.toMatchObject({ status: 404 });
    expect(query.mock.calls[1][0]).toContain("m.role='owner'");
  });
  it("reports a conflict when a project has references", async () => {
    const query = vi.fn().mockRejectedValue({ code: "23503" });
    const auth = new PostgresAuth({ query } as unknown as ConstructorParameters<
      typeof PostgresAuth
    >[0]);
    await expect(auth.deleteProject("8", "19")).rejects.toMatchObject({
      status: 409,
      code: "PROJECT_IN_USE",
    });
  });
});
