import type { Request, Response } from "express";
import type { AuthGrant } from "../models/user.model.js";

export const cookieName = "qa_session";

export function cookieToken(request: Request): string | undefined {
  const values = (request.headers.cookie ?? "").split(";").map((value) => value.trim()).filter((value) => value.startsWith(`${cookieName}=`));
  if (values.length !== 1) return undefined;
  const value = values[0].slice(cookieName.length + 1);
  return /^[a-f0-9]{64}$/.test(value) ? value : undefined;
}

export const cookieOptions = () => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/api" });

export function sendGrant(response: Response, grant: AuthGrant, status: number) {
  response.cookie(cookieName, grant.token, { ...cookieOptions(), expires: grant.expiresAt });
  response.status(status).json({ data: { user: grant.user, csrfToken: grant.csrfToken } });
}
