import { HttpError } from "../http-error.js";

export type AccountLinkPurpose = "activation" | "recovery";
export type AccountLinkDelivery = (input: {
  email: string;
  token: string;
  purpose: AccountLinkPurpose;
  expiresAt: string;
}) => Promise<void>;

export function accountLinkDelivery(env: NodeJS.ProcessEnv): AccountLinkDelivery | undefined {
  const { ACCOUNT_LINK_WEBHOOK_URL, ACCOUNT_LINK_WEBHOOK_TOKEN, ACCOUNT_LINK_APP_URL } = env;
  if (!ACCOUNT_LINK_WEBHOOK_URL && !ACCOUNT_LINK_WEBHOOK_TOKEN && !ACCOUNT_LINK_APP_URL) return;
  if (!ACCOUNT_LINK_WEBHOOK_URL || !ACCOUNT_LINK_WEBHOOK_TOKEN?.trim() || !ACCOUNT_LINK_APP_URL)
    throw new Error("Configura las tres variables ACCOUNT_LINK para habilitar los enlaces.");
  if (!URL.canParse(ACCOUNT_LINK_WEBHOOK_URL) || !URL.canParse(ACCOUNT_LINK_APP_URL))
    throw new Error("Configura URLs válidas para ACCOUNT_LINK_WEBHOOK_URL y ACCOUNT_LINK_APP_URL.");
  const webhook = new URL(ACCOUNT_LINK_WEBHOOK_URL);
  const app = new URL(ACCOUNT_LINK_APP_URL);
  if (
    [webhook, app].some(
      (url) => url.protocol !== "https:" || url.username || url.password || url.hash || url.search,
    )
  )
    throw new Error("Usa URLs HTTPS sin credenciales, fragmento ni parámetros para ACCOUNT_LINK.");
  return async ({ email, token, purpose, expiresAt }) => {
    const link = new URL(app);
    link.hash = new URLSearchParams({ "account-link": token }).toString();
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCOUNT_LINK_WEBHOOK_TOKEN}`,
      },
      body: JSON.stringify({ email, purpose, url: link.href, expiresAt }),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      throw new HttpError(
        503,
        "ACCOUNT_LINK_DELIVERY_FAILED",
        "El servicio de correo no aceptó el enlace.",
      );
  };
}
