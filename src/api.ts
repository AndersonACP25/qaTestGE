import type { Bug as ApiBug } from "../backend/src/models/bug.model";
import type { TestCase as ApiCase } from "../backend/src/models/test-case.model";
import type { TestRun as ApiRun } from "../backend/src/models/test-run.model";
import type { Evidence as ApiEvidence } from "../backend/src/models/evidence.model";
import type { Bug, TestCase, TestRun, Evidence } from "./types";

export interface User { id: string; name: string; email: string }
export interface Project { id: string; organizationId: string; name: string; description: string }
export interface SessionState { user: User; csrfToken: string }
let csrfToken = "";
export function setCsrfToken(value: string) { csrfToken = value; }
export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (csrfToken && options.method && options.method !== "GET") headers.set("X-CSRF-Token", csrfToken);
  let response: Response;
  try { response = await fetch(`/api${path}`, { ...options, headers, credentials: "include" }); }
  catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("No se pudo conectar con la API. Revisa que el backend esté iniciado.", 0, "NETWORK_ERROR");
  }
  if (response.status === 204) return undefined as T;
  let body;
  try { body = await response.json(); }
  catch { throw new ApiError("La API devolvió una respuesta no válida.", response.status, "INVALID_RESPONSE"); }
  if (!response.ok) {
    if (response.status === 401 && !["/auth/login", "/auth/register"].includes(path)) window.dispatchEvent(new Event("qa:unauthorized"));
    throw new ApiError(body.error?.message ?? "No se pudo completar la operación.", response.status, body.error?.code ?? "API_ERROR");
  }
  return body.data as T;
}
const date = (value: string) => new Date(value).toLocaleString("es");
export const toBug = (b: ApiBug): Bug => ({ ...b, assignee: b.assignee || "—", color: "blue", updated: date(b.createdAt) });
export const toCase = (c: ApiCase): TestCase => ({ ...c, updated: date(c.createdAt) });
export const toRun = (r: ApiRun): TestRun => ({ ...r, cases: `${r.caseCount} ${r.caseCount === 1 ? "caso" : "casos"}` });
export const toEvidence = (e: ApiEvidence): Evidence => ({ ...e, related: e.related.join(", ") || "Sin vincular", size: `${(e.sizeBytes / 1024).toFixed(1)} KB`, date: date(e.createdAt) });
export async function loadProject(projectId: string, signal?: AbortSignal) {
  const query = `?projectId=${encodeURIComponent(projectId)}`;
  const [bugs, cases, runs, evidence] = await Promise.all([
    api<ApiBug[]>(`/bugs${query}`, { signal }), api<ApiCase[]>(`/test-cases${query}`, { signal }),
    api<ApiRun[]>(`/test-runs${query}`, { signal }), api<ApiEvidence[]>(`/evidence${query}`, { signal }),
  ]);
  return { bugs: bugs.map(toBug), cases: cases.map(toCase), runs: runs.map(toRun), evidence: evidence.map(toEvidence) };
}
