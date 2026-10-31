import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export function requestContext(
  log: (entry: {
    requestId: string;
    method: string;
    route: string;
    status: number;
    durationMs: number;
  }) => void = (entry) => {
    if (process.env.NODE_ENV !== "test") console.info(JSON.stringify(entry));
  },
): RequestHandler {
  return (request, response, next) => {
    const requestId = randomUUID();
    const resource = request.originalUrl.match(
      /^\/api\/(auth|projects|teams|team-invitations|bugs|test-cases|test-runs|evidence|tags|comments|activity|project-members|mention-notifications|bug-workflow|test-plans)(?:\/|\?|$)/,
    )?.[1];
    const started = performance.now();
    response.locals.requestId = requestId;
    response.setHeader("X-Request-ID", requestId);
    response.once("finish", () => {
      // Route patterns exclude query strings, entity values and request bodies.
      const path = typeof request.route?.path === "string" ? request.route.path : "unmatched";
      const route = resource
        ? path.startsWith(`/${resource}`)
          ? `/api${path}`
          : `/api/${resource}${path === "/" ? "" : path === "unmatched" ? "/*" : path}`
        : path;
      log({
        requestId,
        method: request.method,
        route,
        status: response.statusCode,
        durationMs: Math.round(performance.now() - started),
      });
    });
    next();
  };
}
