import type {
  Bug as ApiBug,
  CreateBugInput,
  UpdateBugInput,
} from "../backend/src/models/bug.model";
import type {
  CreateTestCaseInput,
  TestCase as ApiCase,
} from "../backend/src/models/test-case.model";
import type { TestRun as ApiRun } from "../backend/src/models/test-run.model";
import type {
  Evidence as ApiEvidence,
  UpdateEvidenceInput,
} from "../backend/src/models/evidence.model";
import type {
  Bug,
  BugStatus,
  CaseStatus,
  TestCase,
  TestCaseAttachment,
  TestRun,
  Evidence,
} from "./types";

export interface User {
  id: string;
  name: string;
  email: string;
}
export interface AccountProfile {
  name: string;
  email: string;
}
export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}
export type BugTemplatePriority = "Crítica" | "Alta" | "Media" | "Baja";
export interface BugTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  priority: BugTemplatePriority;
  createdAt: string;
}
export interface BugTemplateInput {
  name: string;
  title: string;
  description: string;
  priority: BugTemplatePriority;
}
export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string;
}
export interface SessionState {
  user: User;
  csrfToken: string;
}
let csrfToken = "";
export function setCsrfToken(value: string) {
  csrfToken = value;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof Blob) &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof ArrayBuffer)
  )
    headers.set("Content-Type", "application/json");
  if (csrfToken && options.method && options.method !== "GET")
    headers.set("X-CSRF-Token", csrfToken);
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, headers, credentials: "include" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      "No se pudo conectar con la API. Revisa que el backend esté iniciado.",
      0,
      "NETWORK_ERROR",
    );
  }
  if (response.status === 204) return undefined as T;
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      "La API devolvió una respuesta no válida.",
      response.status,
      "INVALID_RESPONSE",
    );
  }
  if (!response.ok) {
    if (response.status === 401 && body.error?.code === "UNAUTHENTICATED")
      window.dispatchEvent(new Event("qa:unauthorized"));
    throw new ApiError(
      body.error?.message ?? "No se pudo completar la operación.",
      response.status,
      body.error?.code ?? "API_ERROR",
    );
  }
  return body.data as T;
}
export async function createTestCase(input: CreateTestCaseInput) {
  return toCase(await api<ApiCase>("/test-cases", { method: "POST", body: JSON.stringify(input) }));
}
export async function createBug(input: CreateBugInput) {
  return toBug(await api<ApiBug>("/bugs", { method: "POST", body: JSON.stringify(input) }));
}
export async function updateBug(id: string, projectId: string, input: UpdateBugInput) {
  return toBug(
    await api<ApiBug>(`/bugs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ projectId, ...input }),
    }),
  );
}
export async function updateEvidence(id: string, projectId: string, input: UpdateEvidenceInput) {
  return toEvidence(
    await api<ApiEvidence>(`/evidence/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ projectId, ...input }),
    }),
  );
}
export async function deleteEvidence(id: string, projectId: string) {
  return api<void>(
    `/evidence/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
    { method: "DELETE", body: JSON.stringify({}) },
  );
}
export async function updateTestCase(
  id: string,
  projectId: string,
  input: Omit<CreateTestCaseInput, "projectId">,
) {
  return toCase(
    await api<ApiCase>(`/test-cases/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ projectId, ...input }),
    }),
  );
}
export async function deleteTestCase(id: string, projectId: string) {
  return api<void>(
    `/test-cases/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
    { method: "DELETE", body: JSON.stringify({}) },
  );
}
export async function listTestCaseAttachments(id: string, projectId: string) {
  return api<TestCaseAttachment[]>(
    `/test-cases/${encodeURIComponent(id)}/attachments?projectId=${encodeURIComponent(projectId)}`,
  );
}
export async function addTestCaseLink(id: string, projectId: string, name: string, url: string) {
  return api<TestCaseAttachment>(`/test-cases/${encodeURIComponent(id)}/attachments`, {
    method: "POST",
    body: JSON.stringify({ projectId, name, url }),
  });
}
export async function uploadTestCaseImage(id: string, projectId: string, file: File) {
  const path = `/test-cases/${encodeURIComponent(id)}/attachments/image?projectId=${encodeURIComponent(projectId)}&name=${encodeURIComponent(file.name)}`;
  return api<TestCaseAttachment>(path, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
}
export async function deleteTestCaseAttachment(
  caseId: string,
  attachmentId: string,
  projectId: string,
) {
  return api<void>(
    `/test-cases/${encodeURIComponent(caseId)}/attachments/${encodeURIComponent(attachmentId)}?projectId=${encodeURIComponent(projectId)}`,
    { method: "DELETE", body: JSON.stringify({}) },
  );
}
export function testCaseImageUrl(caseId: string, attachmentId: string, projectId: string) {
  return `/api/test-cases/${encodeURIComponent(caseId)}/attachments/${encodeURIComponent(attachmentId)}/image?projectId=${encodeURIComponent(projectId)}`;
}
const date = (value: string) => new Date(value).toLocaleString("es");
export const toBug = (b: ApiBug): Bug => ({
  ...b,
  assignee: b.assignee || "—",
  color: "blue",
  updated: date(b.createdAt),
});
export const toCase = (c: ApiCase): TestCase => ({ ...c, updated: date(c.createdAt) });
export const toRun = (r: ApiRun): TestRun => ({
  ...r,
  cases: `${r.caseCount} ${r.caseCount === 1 ? "caso" : "casos"}`,
});
export const toEvidence = (e: ApiEvidence): Evidence => ({
  ...e,
  related: e.related.join(", ") || "Sin vincular",
  size: `${(e.sizeBytes / 1024).toFixed(1)} KB`,
  date: date(e.createdAt),
});
export async function saveBugStatus(id: string, projectId: string, status: BugStatus) {
  const updated = await api<ApiBug>(`/bugs/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ projectId, status }),
  });
  return toBug(updated);
}
export async function saveCaseStatus(id: string, projectId: string, status: CaseStatus) {
  const updated = await api<ApiCase>(`/test-cases/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ projectId, status }),
  });
  return toCase(updated);
}
export async function loadProject(projectId: string, signal?: AbortSignal) {
  const query = `?projectId=${encodeURIComponent(projectId)}`;
  const [bugs, cases, runs, evidence] = await Promise.all([
    api<ApiBug[]>(`/bugs${query}`, { signal }),
    api<ApiCase[]>(`/test-cases${query}`, { signal }),
    api<ApiRun[]>(`/test-runs${query}`, { signal }),
    api<ApiEvidence[]>(`/evidence${query}`, { signal }),
  ]);
  return {
    bugs: bugs.map(toBug),
    cases: cases.map(toCase),
    runs: runs.map(toRun),
    evidence: evidence.map(toEvidence),
  };
}
