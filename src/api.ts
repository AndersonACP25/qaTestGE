import type { ApiBug, ApiCase, ApiRun, ApiEvidence } from "./contracts/apiContracts";
import { parseApiData, parseApiEnvelope } from "./contracts/apiContracts";
import type { CreateBugInput, UpdateBugInput } from "../backend/src/models/bug.model";
import type { CreateTestCaseInput } from "../backend/src/models/test-case.model";
import type {
  UpdateTestRunInput,
  UpdateRunResultInput,
} from "../backend/src/models/test-run.model";
import type { UpdateEvidenceInput } from "../backend/src/models/evidence.model";
import type {
  Bug,
  BugStatus,
  CaseStatus,
  TestCase,
  TestCaseAttachment,
  TestRun,
  Evidence,
  Tag,
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
export interface TagInput {
  projectId: string;
  name: string;
  color: string;
}
export async function listTags(projectId: string) {
  return api<Tag[]>(`/tags?projectId=${encodeURIComponent(projectId)}`);
}
export async function createTag(input: TagInput) {
  return api<Tag>("/tags", { method: "POST", body: JSON.stringify(input) });
}
export async function updateTag(id: string, input: TagInput) {
  return api<Tag>(`/tags/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export async function deleteTag(id: string, projectId: string) {
  return api<void>(`/tags/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
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
export function httpErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    "400": "La solicitud no es válida. Revisa los datos.",
    "401": "Inicia sesión para continuar.",
    "403": "No tienes permiso para realizar esta operación.",
    "404": "No se encontró el recurso solicitado.",
    "408": "La solicitud tardó demasiado. Inténtalo de nuevo.",
    "409": "Los datos entran en conflicto con un registro existente.",
    "413": "El archivo o la solicitud supera el tamaño permitido.",
    "415": "El formato enviado no está permitido.",
    "422": "Revisa los datos antes de continuar.",
    "429": "Demasiadas solicitudes. Espera un momento antes de reintentar.",
    "500": "Ocurrió un error interno. Inténtalo de nuevo más tarde.",
    "502": "No se pudo contactar con la API. Comprueba que el backend está iniciado.",
    "503": "El servicio no está disponible. Inténtalo de nuevo más tarde.",
    "504": "La API tardó demasiado en responder. Inténtalo de nuevo.",
  };
  return messages[status] ?? "No se pudo completar la operación.";
}
async function responseError(response: Response): Promise<ApiError> {
  let body;
  try {
    body = await response.json();
  } catch {
    /* El proxy puede devolver texto o HTML. */
  }
  const error = body?.error;
  const code = typeof error?.code === "string" ? error.code : "API_ERROR";
  const message =
    typeof error?.message === "string" && error.message.trim()
      ? error.message
      : httpErrorMessage(response.status);
  if (response.status === 401 && code === "UNAUTHENTICATED")
    window.dispatchEvent(new Event("qa:unauthorized"));
  return new ApiError(message, response.status, code);
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
  if (!response.ok) throw await responseError(response);
  if (response.status === 204) {
    const method = (options.method ?? "GET").toUpperCase();
    const pathname = path.split("?")[0];
    const valid =
      method === "DELETE" ||
      (method === "PATCH" &&
        (pathname === "/auth/password" || /^\/teams\/[^/]+$/.test(pathname))) ||
      (method === "POST" && ["/auth/logout", "/team-invitations/accept"].includes(pathname));
    if (!valid)
      throw new ApiError("La API no devolvió los datos esperados.", 204, "INVALID_RESPONSE");
    return undefined as T;
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      `La API devolvió una respuesta no válida (HTTP ${response.status}). Comprueba que el backend esté iniciado y PostgreSQL disponible.`,
      response.status,
      "INVALID_RESPONSE",
    );
  }
  try {
    // The only generic assertion is at this validated HTTP boundary.
    return parseApiData(path, (options.method ?? "GET").toUpperCase(), parseApiEnvelope(body)) as T;
  } catch {
    throw new ApiError(
      "La API devolvió datos con un formato inesperado. Inténtalo de nuevo.",
      response.status,
      "INVALID_RESPONSE",
    );
  }
}
export async function createTestCase(input: CreateTestCaseInput, requestKey?: string) {
  return toCase(
    await api<ApiCase>("/test-cases", {
      method: "POST",
      body: JSON.stringify(input),
      headers: requestKey ? { "Idempotency-Key": requestKey } : undefined,
    }),
  );
}
export async function createBug(input: CreateBugInput, requestKey?: string) {
  return toBug(
    await api<ApiBug>("/bugs", {
      method: "POST",
      body: JSON.stringify(input),
      headers: requestKey ? { "Idempotency-Key": requestKey } : undefined,
    }),
  );
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
export async function uploadEvidenceFile(
  id: string | null,
  projectId: string,
  file: File,
  related?: string | null,
) {
  const path = id
    ? `/evidence/${encodeURIComponent(id)}/file?projectId=${encodeURIComponent(projectId)}&name=${encodeURIComponent(file.name)}`
    : `/evidence/upload?projectId=${encodeURIComponent(projectId)}&name=${encodeURIComponent(file.name)}${related ? `&related=${encodeURIComponent(related)}` : ""}`;
  return toEvidence(
    await api<ApiEvidence>(path, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    }),
  );
}
export async function downloadEvidenceFile(id: string, projectId: string, fileName: string) {
  let response: Response;
  try {
    response = await fetch(
      `/api/evidence/${encodeURIComponent(id)}/file?projectId=${encodeURIComponent(projectId)}`,
      { credentials: "include" },
    );
  } catch {
    throw new Error("No se pudo conectar con la API para descargar el archivo.");
  }
  if (!response.ok) throw await responseError(response);
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
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
export async function deleteBug(id: string, projectId: string) {
  return api<void>(`/bugs/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
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
export async function updateTestRun(id: string, projectId: string, input: UpdateTestRunInput) {
  return toRun(
    await api<ApiRun>(`/test-runs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ projectId, ...input }),
    }),
  );
}
export async function deleteTestRun(id: string, projectId: string) {
  return api<void>(
    `/test-runs/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
    { method: "DELETE", body: JSON.stringify({}) },
  );
}
export async function updateTestRunResult(
  id: string,
  resultId: string,
  projectId: string,
  input: UpdateRunResultInput,
) {
  return toRun(
    await api<ApiRun>(
      `/test-runs/${encodeURIComponent(id)}/results/${encodeURIComponent(resultId)}`,
      { method: "PATCH", body: JSON.stringify({ projectId, ...input }) },
    ),
  );
}
export const toEvidence = (e: ApiEvidence): Evidence => ({
  ...e,
  hasFile: e.hasFile,
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
