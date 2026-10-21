import { Router, type RequestHandler } from "express";
import type { AuthProvider } from "../models/user.model.js";
import type { Repository } from "../repositories/repository.js";
import { AuthorizedRepository } from "./authorized-repository.js";
import { HttpError } from "../http-error.js";
import { createAuthController } from "../controllers/auth.controller.js";
import { cookieToken } from "./cookies.js";
import { authRateLimit } from "./middleware.js";

export function sameOrigin(): RequestHandler {
  return (request, _response, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      next();
      return;
    }
    const origin = request.get("origin");
    const allowed =
      process.env.FRONTEND_ORIGIN ?? process.env.CORS_ORIGIN ?? "http://localhost:5173";
    const apiOrigin = process.env.API_ORIGIN ?? `http://localhost:${process.env.PORT ?? 3000}`;
    const validContentType =
      request.is("application/json") ||
      ["image/png", "image/jpeg", "image/gif", "image/webp"].some((type) => request.is(type));
    if ((origin && origin !== allowed && origin !== apiOrigin) || !validContentType) {
      next(new HttpError(403, "INVALID_ORIGIN", "Origen o formato de solicitud no permitido."));
      return;
    }
    next();
  };
}

export function authRouter(auth: AuthProvider) {
  const router = Router();
  const controller = createAuthController(auth);
  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  const limiter = authRateLimit();
  router.post("/register", limiter, controller.register);
  router.post("/login", limiter, controller.login);
  router.get("/me", controller.me);
  router.patch("/me", controller.updateProfile);
  router.patch("/password", controller.changePassword);
  router.get("/bug-templates", controller.listBugTemplates);
  router.post("/bug-templates", controller.createBugTemplate);
  router.patch("/bug-templates/:templateId", controller.updateBugTemplate);
  router.delete("/bug-templates/:templateId", controller.deleteBugTemplate);
  router.delete("/me", controller.deactivateAccount);
  router.post("/logout", controller.logout);
  return router;
}

export function requireAuth(auth: AuthProvider, base: Repository): RequestHandler {
  return async (request, response, next) => {
    const token = cookieToken(request);
    const session = token && (await auth.authenticate(token));
    if (!session)
      throw new HttpError(401, "UNAUTHENTICATED", "Tu sesión expiró. Inicia sesión de nuevo.");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      request.get("X-CSRF-Token") !== session.csrfToken
    )
      throw new HttpError(403, "INVALID_CSRF", "Recarga la página para renovar la sesión.");
    response.setHeader("Cache-Control", "no-store");
    response.locals.repository = new AuthorizedRepository(base, () =>
      auth.projects(session.user.id),
    );
    response.locals.user = session.user;
    next();
  };
}
