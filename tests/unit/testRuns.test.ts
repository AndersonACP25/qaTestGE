import { describe, expect, it, vi } from "vitest";
import type { DatabasePool as Pool } from "../../backend/src/repositories/postgres.repository";
import { PostgresRepository } from "../../backend/src/repositories/postgres.repository";
import { AuthorizedRepository } from "../../backend/src/auth/authorized-repository";
import type { Repository } from "../../backend/src/repositories/repository";

function setup({ completed = false, pending = false, linked = false, count = 1 } = {}) {
  const row = {
    id: "1",
    project_id: "1",
    title: "Run",
    owner: "QA",
    status: "En curso",
    created_at: new Date("2026-01-01Z"),
    case_ids: ["1"],
    progress: 100,
    results: [],
    tag_ids: [],
  };
  const query = vi.fn(async (sql: string, _values?: unknown[]) => {
    if (sql.includes("FOR UPDATE"))
      return { rows: [{ id: "1", status: completed ? "Completado" : "En curso" }], rowCount: 1 };
    if (sql.includes("qa.evidence_links"))
      return { rows: linked ? [{}] : [], rowCount: linked ? 1 : 0 };
    if (sql.startsWith("SELECT id,executed_at"))
      return {
        rows: Array.from({ length: count }, () => ({
          id: "1",
          executed_at: pending ? null : new Date(),
        })),
        rowCount: count,
      };
    if (sql.startsWith("SELECT r.*")) return { rows: [row], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  });
  const release = vi.fn();
  const repo = new PostgresRepository({
    query,
    connect: async () => ({ query, release }),
  } as unknown as Pool);
  return { repo, query, release };
}
const input = {
  title: " Run editado ",
  owner: " QA ",
  caseIds: ["TC-001"],
  status: "En curso" as const,
};

describe("persistencia de ejecuciones sin PostgreSQL real", () => {
  it("registra Omitido explícito como ejecutado y limita la escritura a resultado, ejecución y proyecto", async () => {
    const { repo, query } = setup();
    await repo.updateRunResult("1", "7", "1", { status: "skipped", notes: "No aplica" });
    const call = query.mock.calls.find(([sql]) => sql.startsWith("UPDATE qa.test_run_results"));
    expect(call?.[0]).toContain("executed_at=now()");
    expect(call?.[0]).toContain("test_run_id=$1 AND id=$2 AND project_id=$3");
    expect(call?.[1]).toEqual(["1", "7", "1", "skipped", "No aplica"]);
  });
  it("mantiene snapshots y resultados existentes, con SQL parametrizado", async () => {
    const { repo, query, release } = setup();
    await repo.updateRun("1", "1", input);
    const insert = query.mock.calls.find(([sql]) =>
      sql.startsWith("INSERT INTO qa.test_run_results"),
    );
    expect(insert?.[0]).toContain("ON CONFLICT(test_run_id,test_case_id) DO NOTHING");
    expect(
      query.mock.calls.find(([sql]) => sql.startsWith("DELETE FROM qa.test_run_results"))?.[0],
    ).toContain("NOT(test_case_id=ANY");
    expect(query.mock.calls.some(([sql]) => sql === "COMMIT")).toBe(true);
    expect(release).toHaveBeenCalledOnce();
  });
  it("rechaza completar con resultados pendientes y revierte", async () => {
    const { repo, query } = setup({ pending: true });
    await expect(
      repo.updateRun("1", "1", { ...input, status: "Completado" }),
    ).rejects.toMatchObject({ code: "RUN_INCOMPLETE", status: 409 });
    expect(query.mock.calls.some(([sql]) => sql === "ROLLBACK")).toBe(true);
  });
  it("rechaza casos ajenos o inexistentes", async () => {
    const { repo } = setup({ count: 0 });
    await expect(repo.updateRun("1", "1", input)).rejects.toMatchObject({
      code: "INVALID_REFERENCE",
    });
  });
  it("no altera resultados de ejecuciones completadas", async () => {
    const { repo, query } = setup({ completed: true });
    await expect(
      repo.updateRunResult("1", "1", "1", { status: "failed", notes: "" }),
    ).rejects.toMatchObject({ code: "RUN_COMPLETED" });
    expect(query.mock.calls.some(([sql]) => sql.startsWith("UPDATE qa.test_run_results"))).toBe(
      false,
    );
  });
  it("rechaza eliminar ejecuciones o retirar resultados con evidencias", async () => {
    const { repo } = setup({ linked: true });
    await expect(repo.deleteRun("1", "1")).rejects.toMatchObject({ code: "RUN_REFERENCED" });
    await expect(repo.updateRun("1", "1", input)).rejects.toMatchObject({ code: "RUN_REFERENCED" });
  });
  it("elimina resultados antes de la ejecución y conserva los casos", async () => {
    const { repo, query } = setup();
    expect(await repo.deleteRun("1", "1")).toBe(true);
    const deletes = query.mock.calls.map(([sql]) => sql).filter((sql) => sql.startsWith("DELETE"));
    expect(deletes[0]).toContain("qa.test_run_results");
    expect(deletes[1]).toContain("qa.test_runs ");
    expect(deletes.some((sql) => sql.includes("qa.test_cases"))).toBe(false);
  });
  it("comprueba autorización antes de cualquier escritura", async () => {
    const base = {
      updateRun: vi.fn(),
      deleteRun: vi.fn(),
      updateRunResult: vi.fn(),
    } as unknown as Repository;
    const repo = new AuthorizedRepository(base, async () => []);
    await expect(repo.updateRun("1", "2", input)).rejects.toMatchObject({ status: 404 });
    await expect(repo.deleteRun("1", "2")).rejects.toMatchObject({ status: 404 });
    await expect(
      repo.updateRunResult("1", "1", "2", { status: "passed", notes: "" }),
    ).rejects.toMatchObject({ status: 404 });
    expect(base.updateRun).not.toHaveBeenCalled();
    expect(base.deleteRun).not.toHaveBeenCalled();
    expect(base.updateRunResult).not.toHaveBeenCalled();
  });
});
