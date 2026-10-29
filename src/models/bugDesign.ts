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

function key(userId: string, projectId: string) {
  return `qatestge-bug-drafts-v1:${userId}:${projectId}`;
}

export function loadBugDrafts(
  userId: string,
  projectId: string,
  storage?: Pick<Storage, "getItem">,
): BugDraft[] {
  const stored: unknown = JSON.parse(
    (storage ?? window.localStorage).getItem(key(userId, projectId)) ?? "[]",
  );
  if (!Array.isArray(stored)) throw new Error("No se pudieron leer los borradores locales.");
  const ids = new Set<string>();
  return stored.filter((draft): draft is BugDraft => {
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
  (storage ?? window.localStorage).setItem(key(userId, projectId), JSON.stringify(drafts));
}
