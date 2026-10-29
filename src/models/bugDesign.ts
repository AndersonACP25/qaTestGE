import type { BugTemplate, BugTemplatePriority } from "../api";

export interface BugDraft {
  id: string;
  source: string;
  templateId: string;
  title: string;
  description: string;
  priority: BugTemplatePriority;
  tagIds: string[];
}

export function prepareBug(
  source: string,
  template?: BugTemplate,
): Omit<BugDraft, "id" | "tagIds"> {
  const text = source.trim();
  if (!text || text.length > 3500)
    throw new Error("Describe el problema con entre 1 y 3500 caracteres.");
  const description = [template?.description.trim(), "## Problema observado\n\n" + text]
    .filter(Boolean)
    .join("\n\n");
  if (description.length > 5000)
    throw new Error(
      "La plantilla y el problema superan los 5000 caracteres. Reduce el texto o usa otra plantilla.",
    );
  return {
    source: text,
    templateId: template?.id ?? "",
    title: [template?.title.trim(), text.split(/\r?\n/)[0]].filter(Boolean).join(" ").slice(0, 200),
    description,
    priority: template?.priority ?? "Media",
  };
}

export function bugDraftsKey(userId: string, projectId: string) {
  return `qatestge-bug-drafts-v1:${userId}:${projectId}`;
}

export function loadBugDrafts(
  userId: string,
  projectId: string,
  storage?: Pick<Storage, "getItem">,
): BugDraft[] {
  const stored: unknown = JSON.parse(
    (storage ?? window.localStorage).getItem(bugDraftsKey(userId, projectId)) ?? "[]",
  );
  const entries = Array.isArray(stored)
    ? stored
    : typeof stored === "object" &&
        stored !== null &&
        "version" in stored &&
        stored.version === 2 &&
        "drafts" in stored
      ? stored.drafts
      : null;
  if (!Array.isArray(entries)) throw new Error("No se pudieron leer los borradores locales.");
  const ids = new Set<string>();
  return entries.filter((draft): draft is BugDraft => {
    if (!draft || typeof draft !== "object") return false;
    const valid =
      typeof draft.id === "string" &&
      !ids.has(draft.id) &&
      typeof draft.source === "string" &&
      draft.source.length <= 3500 &&
      typeof draft.title === "string" &&
      draft.title.length <= 200 &&
      typeof draft.description === "string" &&
      draft.description.length <= 5000 &&
      typeof draft.templateId === "string" &&
      ["Crítica", "Alta", "Media", "Baja"].includes(draft.priority) &&
      Array.isArray(draft.tagIds) &&
      draft.tagIds.every((id: unknown) => typeof id === "string");
    if (valid) ids.add(draft.id);
    return valid;
  });
}

export function saveBugDrafts(
  userId: string,
  projectId: string,
  drafts: BugDraft[],
  storage?: Pick<Storage, "setItem">,
) {
  (storage ?? window.localStorage).setItem(bugDraftsKey(userId, projectId), JSON.stringify(drafts));
}

export function loadBugDraftDocument(
  userId: string,
  projectId: string,
  storage: Pick<Storage, "getItem"> = window.localStorage,
) {
  const raw = storage.getItem(bugDraftsKey(userId, projectId));
  const input: unknown = raw ? JSON.parse(raw) : [];
  const revision =
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    "revision" in input &&
    typeof input.revision === "string"
      ? input.revision
      : "0";
  const drafts = loadBugDrafts(userId, projectId, storage);
  const entries = Array.isArray(input)
    ? input
    : typeof input === "object" && input !== null && "drafts" in input
      ? input.drafts
      : undefined;
  if (!Array.isArray(entries) || entries.length !== drafts.length)
    throw new Error("Hay borradores con formato inválido. No se sobrescribirán los datos locales.");
  return { revision, drafts };
}
/** Called under the named Web Lock by browser clients. */
export function saveBugDraftDocument(
  userId: string,
  projectId: string,
  drafts: BugDraft[],
  expectedRevision: string,
  storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage,
) {
  if (loadBugDraftDocument(userId, projectId, storage).revision !== expectedRevision)
    throw new Error(
      "Los borradores cambiaron en otra pestaña. Actualiza la lista antes de guardar.",
    );
  const revision = crypto.randomUUID();
  storage.setItem(
    bugDraftsKey(userId, projectId),
    JSON.stringify({ version: 2, revision, drafts }),
  );
  return { revision, drafts };
}
