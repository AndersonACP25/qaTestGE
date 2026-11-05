import { isId, parseReference, resourceId } from "../../backend/src/validation";

const prefixes = { bug: "BUG", case: "TC", run: "RUN" } as const;
type RecordKind = keyof typeof prefixes;

export function readRecordLink(search: string) {
  const params = new URLSearchParams(search);
  const projectId = params.get("project");
  const record = params.get("record");
  if (!projectId || !isId(projectId) || !record) return null;
  for (const kind of Object.keys(prefixes) as RecordKind[]) {
    const id = parseReference(record, prefixes[kind]);
    if (id) return { projectId, kind, id: resourceId(prefixes[kind], id) };
  }
  return null;
}

export function recordLink(href: string, projectId: string, id: string) {
  const url = new URL(href);
  url.search = new URLSearchParams({ project: projectId, record: id }).toString();
  url.hash = "";
  return url.toString();
}
