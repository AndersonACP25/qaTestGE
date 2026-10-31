import { describe, expect, it, vi } from "vitest";
import { PostgresAuth } from "../../backend/src/auth/auth";
function setup(conflict = false) {
  const query = vi.fn(async (sql: string) => {
    if (conflict && sql.startsWith("DELETE FROM qa.projects")) throw { code: "23503" };
    return {
      rows: sql.startsWith("SELECT id FROM qa.projects") ? [{ id: "19" }] : [],
      rowCount: 1,
    };
  });
  const release = vi.fn();
  return {
    query,
    release,
    auth: new PostgresAuth({
      query,
      connect: async () => ({ query, release }),
    } as unknown as ConstructorParameters<typeof PostgresAuth>[0]),
  };
}
describe("administración por proyecto", () => {
  it("limita cambios a Admin y revierte cuando el proyecto no está disponible", async () => {
    const { auth, query, release } = setup();
    await expect(auth.updateProject("8", "19", "Proyecto", "")).rejects.toMatchObject({
      status: 404,
    });
    expect(query.mock.calls[0][0]).toContain("qa.project_role(p.id,$1)='Admin'");
    query.mockImplementation(async () => ({ rows: [], rowCount: 0 }));
    await expect(auth.deleteProject("8", "19")).rejects.toMatchObject({ status: 404 });
    expect(query.mock.calls.some(([s]) => s === "ROLLBACK")).toBe(true);
    expect(release).toHaveBeenCalled();
  });
  it("revierte la limpieza de accesos y configuración si hay referencias", async () => {
    const { auth, query } = setup(true);
    await expect(auth.deleteProject("8", "19")).rejects.toMatchObject({
      status: 409,
      code: "PROJECT_IN_USE",
    });
    expect(query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
  });
});
