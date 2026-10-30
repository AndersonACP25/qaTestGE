import { describe, expect, it, vi } from "vitest";
import { can, permissions, projectRoles } from "../../backend/src/models/collaboration.model";
import { mentionIds } from "../../backend/src/repositories/collaboration.repository";
import { actorDatabase } from "../../backend/src/auth/actor-database";
import { parseApiData } from "../../src/contracts/apiContracts";
describe("roles y menciones", () => {
  it("aplica la matriz de permisos por proyecto con denegación predeterminada", () => {
    expect(projectRoles).toHaveLength(4);
    expect(permissions.every((p) => can("Admin", p))).toBe(true);
    expect(can("QA", "settings.manage")).toBe(false);
    expect(can("QA", "runs.write")).toBe(true);
    expect(can("Dev", "bugs.write")).toBe(true);
    expect(can("Dev", "cases.write")).toBe(false);
    expect(permissions.some((p) => can("Solo lectura", p))).toBe(false);
    expect(can(undefined, "bugs.write")).toBe(false);
  });
  it("resuelve identificadores estables, elimina duplicados y limita menciones", () => {
    expect(mentionIds("Hola @[Ana](user:12) @[otra etiqueta](user:12) y @[Luis](user:19)")).toEqual(
      ["12", "19"],
    );
    expect(mentionIds("@Ana sin selección <script>texto</script>")).toEqual([]);
    expect(() =>
      mentionIds(Array.from({ length: 21 }, (_, i) => `@[QA](user:${i + 1})`).join(" ")),
    ).toThrow("20 menciones");
    expect(() => mentionIds("@[QA](user:9223372036854775808)")).toThrow();
  });
  it("rechaza roles ajenos al catálogo y respuestas inválidas", () => {
    expect(() =>
      parseApiData("/projects", "GET", [
        { id: "1", organizationId: "1", name: "A", description: "", role: "owner" },
      ]),
    ).toThrow();
    expect(() => parseApiData("/comments", "GET", [{ id: "CMT-1", body: "incompleto" }])).toThrow();
  });
});
describe("contexto de auditoría sin estado global", () => {
  it("limita actor y correlación a cada transacción y libera tras rollback", async () => {
    const query = vi.fn(async (sql: string, values?: unknown[]) => {
      if (sql === "FAIL") throw new Error("fallo simulado");
      return { rows: values ?? [], rowCount: 0, command: "", oid: 0, fields: [] };
    });
    const release = vi.fn();
    const scoped = actorDatabase(
      { query: query as never, connect: async () => ({ query: query as never, release }) },
      "42",
      "request-a",
    );
    await expect(scoped.query("FAIL")).rejects.toThrow("simulado");
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      "BEGIN",
      "SELECT set_config('qa.actor_id',$1,true),set_config('qa.request_id',$2,true)",
      "FAIL",
      "ROLLBACK",
    ]);
    expect(query.mock.calls[1][1]).toEqual(["42", "request-a"]);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
