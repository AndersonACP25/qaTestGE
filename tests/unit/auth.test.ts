import { validateAccess } from "../../src/Session";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../backend/src/auth/passwords";
import { sessionHash } from "../../backend/src/auth/auth";
import { AuthorizedRepository } from "../../backend/src/auth/authorized-repository";
import type { Repository } from "../../backend/src/repositories/repository";
import { vi } from "vitest";

describe("password derivation and session hashes", () => {
  it("stores a salted hash, verifies the password and rejects wrong/malformed credentials", async () => {
    const password = "correct horse battery staple";
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
    expect(await verifyPassword(password, undefined)).toBe(false);
  }, 15000);
  it("produces deterministic one-way session lookup values", () => {
    const token = "a".repeat(64);
    expect(sessionHash(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(sessionHash(token)).not.toBe(token);
    expect(sessionHash(token)).toBe(sessionHash(token));
  });
});

describe("project authorization without database access", () => {
  it("only reads authorized project IDs even when the caller omits a filter", async () => {
    const listBugs = vi.fn().mockResolvedValue([]);
    const base = { listBugs } as unknown as Repository;
    const scoped = new AuthorizedRepository(base, async () => [
      { id: "2", organizationId: "4", name: "Private", description: "" },
    ]);
    await scoped.listBugs();
    expect(listBugs).toHaveBeenCalledExactlyOnceWith("2");
    await expect(scoped.listBugs("1")).rejects.toMatchObject({ status: 404 });
    expect(listBugs).toHaveBeenCalledTimes(1);
  });
});

describe("access validation", () => {
  it("validates form fields without authenticating locally", () => {
    expect(validateAccess("qa@example.test", "123")).toBe("");
    expect(validateAccess("qa@example.test", "a long passphrase", "a long passphrase")).toBe("");
  });
  it("rejects empty values and mismatched registration passwords", () => {
    expect(validateAccess("  ", "123")).not.toBe("");
    expect(validateAccess("demo", "")).not.toBe("");
    expect(validateAccess("demo", "a long passphrase", "different passphrase")).toBe(
      "Las contraseñas no coinciden.",
    );
  });
});
