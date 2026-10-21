import type { RequestHandler } from "express";
import { HttpError } from "../http-error.js";

export function authRateLimit(now = () => Date.now()): RequestHandler {
  const attempts = new Map<string, { count: number; reset: number }>();
  return (request, response, next) => {
    const time = now();
    for (const [key, value] of attempts) if (value.reset <= time) attempts.delete(key);
    const key = request.ip ?? "unknown";
    const value = attempts.get(key) ?? { count: 0, reset: time + 15 * 60 * 1000 };
    if (value.count >= 20 || (!attempts.has(key) && attempts.size >= 5000)) {
      response.setHeader("Retry-After", "900");
      next(
        new HttpError(
          429,
          "TOO_MANY_ATTEMPTS",
          "Demasiados intentos de acceso. Intenta de nuevo más tarde.",
        ),
      );
      return;
    }
    value.count++;
    attempts.set(key, value);
    next();
  };
}
