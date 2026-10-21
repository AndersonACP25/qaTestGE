import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabasePool } from "../../backend/src/repositories/postgres.repository";

vi.mock("../../backend/src/auth/passwords.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("replacement-hash"),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

import { PostgresAuth } from "../../backend/src/auth/auth";
import { hashPassword, verifyPassword } from "../../backend/src/auth/passwords.js";

describe("PostgreSQL account settings provider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes template reads, updates, and deletes to the owning user", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ id: "7", name: "Bug", title: "", description: "", priority: "Media", createdAt: new Date("2026-01-01T00:00:00.000Z") }],
      rowCount: 1,
    });
    const auth = new PostgresAuth({ query } as unknown as DatabasePool);
    await auth.listBugTemplates("12");
    await auth.updateBugTemplate("12", "7", { name: "Bug", title: "", description: "", priority: "Media" });
    await auth.deleteBugTemplate("12", "7");

    expect(query.mock.calls[0][0]).toContain("WHERE user_id=$1");
    expect(query.mock.calls[0][1]).toEqual(["12"]);
    expect(query.mock.calls[1][0]).toContain("WHERE user_id=$1 AND id=$2");
    expect(query.mock.calls[1][1]).toEqual(["12", "7", "Bug", "", "", "Media"]);
    expect(query.mock.calls[2][0]).toContain("WHERE user_id=$1 AND id=$2");
    expect(query.mock.calls[2][1]).toEqual(["12", "7"]);
  });

  it("anonymizes the user and revokes sessions and templates in one transaction", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ password_hash: "existing-hash" }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 2 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] });
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) } as unknown as DatabasePool;
    await new PostgresAuth(pool).deactivateAccount("12", "current password");

    expect(verifyPassword).toHaveBeenCalledWith("current password", "existing-hash");
    expect(hashPassword).toHaveBeenCalledOnce();
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining([
      expect.stringContaining("BEGIN"),
      expect.stringContaining("FOR UPDATE"),
      expect.stringContaining("is_active=false"),
      expect.stringContaining("DELETE FROM qa.auth_sessions"),
      expect.stringContaining("DELETE FROM qa.bug_templates"),
      expect.stringContaining("COMMIT"),
    ]));
    expect(query.mock.calls[2][1][0]).toBe("12");
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back account deactivation when the password is incorrect", async () => {
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);
    const query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ password_hash: "existing-hash" }] });
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) } as unknown as DatabasePool;
    await expect(new PostgresAuth(pool).deactivateAccount("12", "wrong")).rejects.toMatchObject({ code: "INVALID_PASSWORD" });
    expect(query.mock.calls.map(([sql]) => sql)).toContain("ROLLBACK");
    expect(query.mock.calls.map(([sql]) => sql)).not.toContain("COMMIT");
    expect(query.mock.calls.map(([sql]) => sql).join(" ")).not.toContain("DELETE FROM qa.auth_sessions");
    expect(release).toHaveBeenCalledOnce();
  });
});
