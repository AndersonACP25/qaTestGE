import { Router, type Request, type RequestHandler, type Response } from "express";
import type { AuthProvider, AuthGrant } from "./auth.js";
import type { Repository } from "../repositories/repository.js";
import { AuthorizedRepository } from "./authorized-repository.js";
import { HttpError } from "../http-error.js";
import { isRecord, text } from "../validation.js";

export const cookieName = "qa_session";
export function cookieToken(request: Request): string | undefined {
  const values = (request.headers.cookie ?? "").split(";").map((v) => v.trim()).filter((v) => v.startsWith(`${cookieName}=`));
  if (values.length !== 1) return undefined;
  const value = values[0].slice(cookieName.length + 1);
  return /^[a-f0-9]{64}$/.test(value) ? value : undefined;
}
const emailValid = (value: unknown): value is string => text(value, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const passwordValid = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length >= 12 && value.length <= 128;
const cookieOptions = () => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/api" });
function sendGrant(response: Response, grant: AuthGrant, status: number) {
  response.cookie(cookieName, grant.token, { ...cookieOptions(), expires: grant.expiresAt });
  response.status(status).json({ data: { user: grant.user, csrfToken: grant.csrfToken } });
}

// Bounded, per-process IP limiter. Proxy headers are deliberately not trusted.
export function authRateLimit(now = () => Date.now()): RequestHandler {
  const attempts = new Map<string, { count: number; reset: number }>();
  return (request, response, next) => {
    const time = now();
    for (const [key, value] of attempts) if (value.reset <= time) attempts.delete(key);
    const key = request.ip ?? "unknown";
    const value = attempts.get(key) ?? { count: 0, reset: time + 15 * 60 * 1000 };
    if (value.count >= 20 || (!attempts.has(key) && attempts.size >= 5000)) {
      response.setHeader("Retry-After", "900");
      next(new HttpError(429, "TOO_MANY_ATTEMPTS", "Demasiados intentos de acceso. Intenta de nuevo más tarde."));
      return;
    }
    value.count++; attempts.set(key, value); next();
  };
}
export function sameOrigin(): RequestHandler {
  return (request, _response, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) { next(); return; }
    const origin = request.get("origin");
    const allowed = process.env.FRONTEND_ORIGIN ?? process.env.CORS_ORIGIN ?? "http://localhost:5173";
    // Direct API/Swagger origin is allowed as well; Host is not used to authorize a foreign Origin.
    const apiOrigin = process.env.API_ORIGIN ?? `http://localhost:${process.env.PORT ?? 3000}`;
    if ((origin && origin !== allowed && origin !== apiOrigin) || !request.is("application/json")) {
      next(new HttpError(403, "INVALID_ORIGIN", "Origen o formato de solicitud no permitido.")); return;
    }
    next();
  };
}
export function authRouter(auth: AuthProvider) {
  const router = Router();
  router.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
  const limiter = authRateLimit();
  router.post("/register", limiter, async (req, res) => {
    const body: unknown = req.body;
    if (!isRecord(body) || !text(body.name, 100) || !emailValid(body.email) || !passwordValid(body.password)) throw new HttpError(400, "INVALID_REGISTRATION", "Introduce nombre, correo válido y una contraseña de 12 a 128 caracteres.");
    sendGrant(res, await auth.register({ name: body.name, email: body.email, password: body.password }, cookieToken(req)), 201);
  });
  router.post("/login", limiter, async (req, res) => {
    const body: unknown = req.body;
    if (!isRecord(body) || !emailValid(body.email) || typeof body.password !== "string" || !body.password.length || body.password.length > 128) throw new HttpError(400, "INVALID_LOGIN", "Introduce correo y contraseña válidos.");
    sendGrant(res, await auth.login(body.email, body.password, cookieToken(req)), 200);
  });
  router.get("/me", async (req, res) => {
    const token = cookieToken(req);
    const session = token && await auth.authenticate(token);
    if (!session) throw new HttpError(401, "UNAUTHENTICATED", "Inicia sesión para continuar.");
    res.json({ data: session });
  });
  router.post("/logout", async (req, res) => {
    const token = cookieToken(req);
    const session = token && await auth.authenticate(token);
    if (!token || !session) throw new HttpError(401, "UNAUTHENTICATED", "La sesión ya no está activa.");
    if (req.get("X-CSRF-Token") !== session.csrfToken) throw new HttpError(403, "INVALID_CSRF", "Recarga la página para renovar la sesión.");
    await auth.logout(token);
    res.clearCookie(cookieName, cookieOptions());
    res.status(204).end();
  });
  return router;
}
export function requireAuth(auth: AuthProvider, base: Repository): RequestHandler {
  return async (req, res, next) => {
    const token = cookieToken(req);
    const session = token && await auth.authenticate(token);
    if (!session) throw new HttpError(401, "UNAUTHENTICATED", "Tu sesión expiró. Inicia sesión de nuevo.");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("X-CSRF-Token") !== session.csrfToken) throw new HttpError(403, "INVALID_CSRF", "Recarga la página para renovar la sesión.");
    res.setHeader("Cache-Control", "no-store");
    res.locals.repository = new AuthorizedRepository(base, () => auth.projects(session.user.id));
    res.locals.user = session.user;
    next();
  };
}
