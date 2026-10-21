import type { RequestHandler } from "express";
import type { AuthProvider } from "../models/user.model.js";
import { HttpError } from "../http-error.js";
import { isRecord, text } from "../validation.js";
import { cookieOptions, cookieToken, cookieName, sendGrant } from "../auth/cookies.js";

const emailValid = (value: unknown): value is string => text(value, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const passwordValid = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length >= 12 && value.length <= 128;

export function createAuthController(auth: AuthProvider) {
  const register: RequestHandler = async (request, response) => {
    const body: unknown = request.body;
    if (!isRecord(body) || !text(body.name, 100) || !emailValid(body.email) || !passwordValid(body.password)) {
      throw new HttpError(400, "INVALID_REGISTRATION", "Introduce nombre, correo válido y una contraseña de 12 a 128 caracteres.");
    }
    sendGrant(response, await auth.register({ name: body.name, email: body.email, password: body.password }, cookieToken(request)), 201);
  };

  const login: RequestHandler = async (request, response) => {
    const body: unknown = request.body;
    if (!isRecord(body) || !emailValid(body.email) || typeof body.password !== "string" || !body.password.length || body.password.length > 128) {
      throw new HttpError(400, "INVALID_LOGIN", "Introduce correo y contraseña válidos.");
    }
    sendGrant(response, await auth.login(body.email, body.password, cookieToken(request)), 200);
  };

  const me: RequestHandler = async (request, response) => {
    const token = cookieToken(request);
    const session = token && await auth.authenticate(token);
    if (!session) throw new HttpError(401, "UNAUTHENTICATED", "Inicia sesión para continuar.");
    response.json({ data: session });
  };

  const logout: RequestHandler = async (request, response) => {
    const token = cookieToken(request);
    const session = token && await auth.authenticate(token);
    if (!token || !session) throw new HttpError(401, "UNAUTHENTICATED", "La sesión ya no está activa.");
    if (request.get("X-CSRF-Token") !== session.csrfToken) throw new HttpError(403, "INVALID_CSRF", "Recarga la página para renovar la sesión.");
    await auth.logout(token);
    response.clearCookie(cookieName, cookieOptions());
    response.status(204).end();
  };

  const updateProfile: RequestHandler = async (request, response) => {
    const { session } = await requireSession(request, auth);
    requireCsrf(request, session.csrfToken);
    const body: unknown = request.body;
    if (!isRecord(body) || !text(body.name, 100) || !emailValid(body.email)) {
      throw new HttpError(400, "INVALID_PROFILE", "Introduce un nombre y un correo válido.");
    }
    const updated = await auth.updateProfile(session.user.id, { name: body.name.trim(), email: body.email.trim().toLowerCase() });
    response.json({ data: updated });
  };

  const changePassword: RequestHandler = async (request, response) => {
    const { session, token } = await requireSession(request, auth);
    requireCsrf(request, session.csrfToken);
    const body: unknown = request.body;
    if (!isRecord(body) || typeof body.currentPassword !== "string" || !body.currentPassword.length || body.currentPassword.length > 128
      || !passwordValid(body.newPassword)) {
      throw new HttpError(400, "INVALID_PASSWORD", "Introduce la contraseña actual y una nueva de 12 a 128 caracteres.");
    }
    await auth.changePassword(session.user.id, body.currentPassword, body.newPassword, token);
    response.status(204).end();
  };

  return { register, login, me, logout, updateProfile, changePassword };
}

async function requireSession(request: Parameters<RequestHandler>[0], auth: AuthProvider) {
  const token = cookieToken(request);
  const session = token && await auth.authenticate(token);
  if (!token || !session) throw new HttpError(401, "UNAUTHENTICATED", "Inicia sesión para continuar.");
  return { session, token };
}

function requireCsrf(request: Parameters<RequestHandler>[0], csrfToken: string) {
  if (request.get("X-CSRF-Token") !== csrfToken) {
    throw new HttpError(403, "INVALID_CSRF", "Recarga la página para renovar la sesión.");
  }
}
