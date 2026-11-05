import { afterEach, describe, expect, it, vi } from "vitest";
import { accountLinkDelivery } from "../../backend/src/auth/account-link-delivery";

const env = {
  ACCOUNT_LINK_APP_URL: "https://qa.example.test/workspace",
  ACCOUNT_LINK_WEBHOOK_URL: "https://mail.example.test/delivery",
  ACCOUNT_LINK_WEBHOOK_TOKEN: "test-webhook-secret",
};

afterEach(() => vi.unstubAllGlobals());

describe("entrega de enlaces de cuenta", () => {
  it("rechaza configuración parcial, HTTP y credenciales en las URLs", () => {
    expect(accountLinkDelivery({})).toBeUndefined();
    expect(() => accountLinkDelivery({ ACCOUNT_LINK_APP_URL: env.ACCOUNT_LINK_APP_URL })).toThrow();
    expect(() =>
      accountLinkDelivery({ ...env, ACCOUNT_LINK_APP_URL: "http://qa.example.test/" }),
    ).toThrow();
    expect(() =>
      accountLinkDelivery({ ...env, ACCOUNT_LINK_WEBHOOK_URL: "https://user@mail.example.test/" }),
    ).toThrow();
  });

  it("autentica el webhook y transporta el token únicamente en el fragmento del enlace", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    const delivery = accountLinkDelivery(env)!;
    const input = {
      email: "qa@example.test",
      token: "a".repeat(64),
      purpose: "recovery" as const,
      expiresAt: "2026-11-05T00:30:00.000Z",
    };
    await delivery(input);
    const [destination, options] = fetch.mock.calls[0];
    expect(String(destination)).toBe(env.ACCOUNT_LINK_WEBHOOK_URL);
    expect(options).toMatchObject({
      method: "POST",
      redirect: "error",
      headers: { Authorization: `Bearer ${env.ACCOUNT_LINK_WEBHOOK_TOKEN}` },
    });
    expect(JSON.parse(options.body)).toEqual({
      email: input.email,
      purpose: input.purpose,
      expiresAt: input.expiresAt,
      url: `${env.ACCOUNT_LINK_APP_URL}#account-link=${input.token}`,
    });
    fetch.mockResolvedValue({ ok: false });
    await expect(delivery(input)).rejects.toMatchObject({ status: 503 });
  });
});
