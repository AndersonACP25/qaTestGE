import { describe, expect, it, vi } from "vitest";
import { PostgresAuth, sessionHash } from "../../backend/src/auth/auth";

describe("team invitations", () => {
  it("stores a hash and denies generating invitations outside an owned team", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 0 });
    const auth = new PostgresAuth({ query } as unknown as ConstructorParameters<
      typeof PostgresAuth
    >[0]);
    const invitation = await auth.createTeamInvite("1", "4");
    expect(invitation.code).toMatch(/^[a-f0-9]{64}$/);
    expect(query.mock.calls[0][1][2]).toBe(sessionHash(invitation.code));
    expect(query.mock.calls[0][1]).not.toContain(invitation.code);
    await expect(auth.createTeamInvite("1", "5")).rejects.toMatchObject({ status: 404 });
  });
  it("consumes an invitation transactionally and rolls back invalid invitations", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ organization_id: "4" }] });
    const release = vi.fn();
    const auth = new PostgresAuth({
      connect: async () => ({ query, release }),
    } as unknown as ConstructorParameters<typeof PostgresAuth>[0]);
    await auth.acceptTeamInvite("2", "a".repeat(64));
    expect(query.mock.calls.map((call) => String(call[0]).trim().split(/\s+/)[0])).toEqual([
      "BEGIN",
      "SELECT",
      "INSERT",
      "DELETE",
      "COMMIT",
    ]);
    expect(query.mock.calls[2][1]).toEqual(["4", "2"]);
    expect(release).toHaveBeenCalled();
    query
      .mockReset()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});
    await expect(auth.acceptTeamInvite("2", "b".repeat(64))).rejects.toMatchObject({ status: 404 });
    expect(query.mock.calls[2][0]).toBe("ROLLBACK");
  });
});
