import { describe, expect, it, vi } from "vitest";
import { applyMigrations, migrationFiles } from "../../backend/src/migrations";

function client(present: boolean) {
  return {
    query: vi.fn(async (sql: string) => ({
      rows: sql.includes("to_regnamespace") ? [{ present }] : [],
    })),
  };
}

describe("single database installation entry", () => {
  it("installs an empty schema, then the ordered history without demo data", async () => {
    const db = client(false);
    const log = vi.fn();
    await applyMigrations(db as unknown as Parameters<typeof applyMigrations>[0], true, log);
    const queries = db.query.mock.calls.map(([sql]) => sql);
    expect(queries.filter((sql) => sql.includes("CREATE SCHEMA qa;"))).toHaveLength(1);
    expect(log.mock.calls.slice(1).map(([message]) => message)).toEqual(
      migrationFiles.map((name) => `Migración ${name} aplicada/verificada.`),
    );
    expect(queries.join("\n")).not.toContain("INSERT INTO qa.organizations");
    expect(queries.at(-1)).toContain("pg_advisory_unlock");
  });
  it.each([true, false])(
    "does not reimport the base for existing schema/upgrade (%s)",
    async (initialize) => {
      const db = client(true);
      await applyMigrations(db as unknown as Parameters<typeof applyMigrations>[0], initialize);
      expect(db.query.mock.calls.some(([sql]) => sql.includes("CREATE SCHEMA qa;"))).toBe(false);
    },
  );
  it("rolls back failed SQL and releases the install lock without running later steps", async () => {
    const db = client(false);
    db.query.mockImplementation(async (sql) => {
      if (sql.includes("CREATE SCHEMA qa;")) throw new Error("schema failure");
      return { rows: [{ present: false }] };
    });
    await expect(
      applyMigrations(db as unknown as Parameters<typeof applyMigrations>[0], true),
    ).rejects.toThrow("schema failure");
    expect(db.query.mock.calls.slice(-2).map(([sql]) => sql)).toEqual([
      "ROLLBACK",
      "SELECT pg_advisory_unlock(hashtext('qaTestGE:install'))",
    ]);
    expect(db.query.mock.calls.some(([sql]) => sql.includes("CREATE TABLE qa.users"))).toBe(false);
  });
});
