import { describe, expect, it, vi } from "vitest";
import type { DatabasePool as Pool } from "../../backend/src/repositories/postgres.repository";
import { PostgresRepository } from "../../backend/src/repositories/postgres.repository";
import { databaseUrl } from "../../backend/src/config/environment";
import { isId, parseReference, resourceId } from "../../backend/src/validation";

describe("database boundaries without network or environment files", () => {
  it("validates bigint IDs without losing precision", () => {
    expect(isId("9223372036854775807")).toBe(true);
    expect(isId("9223372036854775808")).toBe(false);
    expect(isId(1)).toBe(false);
    expect(isId("1 OR 1=1")).toBe(false);
    expect(parseReference("TC-0001", "TC")).toBe("1");
    expect(parseReference("TC-0", "TC")).toBeNull();
    expect(parseReference("BUG-001", "TC")).toBeNull();
    expect(resourceId("TC", "9007199254740993")).toBe("TC-9007199254740993");
  });
  it("requires an explicit PostgreSQL URL and never repeats secrets in errors", () => {
    expect(databaseUrl({ DATABASE_URL: "postgresql://user:fake@localhost/qa_test_ge" })).toContain(
      "/qa_test_ge",
    );
    expect(() => databaseUrl({})).toThrow("Configura DATABASE_URL");
    expect(() => databaseUrl({ DATABASE_URL: "postgresql://user:fake@localhost/wrong" })).toThrow(
      "URL PostgreSQL válida para qa_test_ge",
    );
  });
  it("parameterizes user values and project filters", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: "9007199254740993",
          project_id: "1",
          created_at: new Date("2026-01-01T00:00:00Z"),
          title: "Bug",
          project: "Demo",
          tag_ids: [],
        },
      ],
    });
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
      query,
    };
    const repo = new PostgresRepository(pool as unknown as Pool);
    await repo.createBug({
      projectId: "1",
      title: "  Robert'); DROP TABLE qa.bugs;--  ",
      priority: "Alta",
    });
    const insertCall = query.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO qa.bugs"),
    );
    expect(insertCall?.[0]).not.toContain("Robert");
    expect(insertCall?.[1]).toEqual(["1", "Robert'); DROP TABLE qa.bugs;--", "", "Alta", null]);
    await repo.listBugs("2");
    expect(query.mock.calls.at(-1)?.[1]).toEqual(["2"]);
  });
  it("persists bug-tag associations atomically and rejects tags from another project", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "9" }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "9",
            project_id: "1",
            created_at: new Date("2026-01-01T00:00:00Z"),
            title: "Issue",
            project: "Demo",
            tag_ids: ["2"],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const client = { query, release: vi.fn() };
    const pool = { connect: vi.fn().mockResolvedValue(client), query };
    const repository = new PostgresRepository(pool as unknown as Pool);
    const created = await repository.createBug({
      projectId: "1",
      title: "Issue",
      priority: "Alta",
      tagIds: ["2"],
    });
    expect(created.tagIds).toEqual(["2"]);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO qa.bug_tags"))).toBe(
      true,
    );
    expect(query.mock.calls.map(([sql]) => sql)).toContain("COMMIT");

    const rejectedQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "10" }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [] });
    const rejectedPool = {
      connect: vi.fn().mockResolvedValue({ query: rejectedQuery, release: vi.fn() }),
    };
    await expect(
      new PostgresRepository(rejectedPool as unknown as Pool).createBug({
        projectId: "1",
        title: "Issue",
        priority: "Alta",
        tagIds: ["999"],
      }),
    ).rejects.toMatchObject({ code: "INVALID_TAG" });
    expect(rejectedQuery.mock.calls.map(([sql]) => sql)).toContain("ROLLBACK");
  });
  it("rolls back a partially created run when some cases are missing", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    query.mockResolvedValueOnce({ rows: [] }); // BEGIN
    query.mockResolvedValueOnce({ rows: [{ id: "7" }] }); // run
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // missing case
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) } as unknown as Pool;
    await expect(
      new PostgresRepository(pool).createRun({
        projectId: "1",
        title: "Run",
        owner: "QA",
        caseIds: ["TC-001"],
      }),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE" });
    expect(query.mock.calls.map(([sql]) => sql)).toContain("ROLLBACK");
    expect(query.mock.calls.map(([sql]) => sql)).not.toContain("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });
  it("rolls back evidence metadata when its reference violates a foreign key", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "9" }] })
      .mockRejectedValueOnce(Object.assign(new Error("foreign key"), { code: "23503" }));
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) } as unknown as Pool;
    await expect(
      new PostgresRepository(pool).createEvidence({
        projectId: "1",
        name: "file",
        type: "Archivo",
        sizeBytes: 0,
        related: "BUG-001",
      }),
    ).rejects.toMatchObject({ code: "23503" });
    expect(query.mock.calls.map(([sql]) => sql)).toContain("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });
});
