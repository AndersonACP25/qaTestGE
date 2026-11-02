function matchesSearch<T extends object>(item: T, fields: (keyof T)[], search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  return (
    !normalizedSearch ||
    fields.some((field) =>
      String(item[field] ?? "")
        .toLowerCase()
        .includes(normalizedSearch),
    )
  );
}

function matchesStatus(item: { status: string }, statusFilter: string) {
  return statusFilter === "Todos" || item.status === statusFilter;
}

function assignmentMatches(value: string | null | undefined, filter: string) {
  return filter === "Todos" || (filter === "Sin asignar" ? !value : value === filter);
}
function tagMatches(tags: string[] | undefined, filter: string) {
  return (
    filter === "Todos" || (filter === "Sin tags" ? !tags?.length : Boolean(tags?.includes(filter)))
  );
}
export function filterBugs<
  T extends {
    id: string;
    title: string;
    project: string;
    priority: string;
    status: string;
    severity?: string;
    assigneeUserId?: string | null;
    tagIds?: string[];
  },
>(
  bugs: T[],
  {
    search = "",
    statusFilter = "Todos",
    project = "Todos los proyectos",
    priority = "Todos",
    severity = "Todos",
    assignee = "Todos",
    tag = "Todos",
  }: {
    search?: string;
    statusFilter?: string;
    project?: string;
    priority?: string;
    severity?: string;
    assignee?: string;
    tag?: string;
  } = {},
) {
  return bugs.filter(
    (bug) =>
      matchesSearch(bug, ["id", "title", "project", "status", "priority"], search) &&
      matchesStatus(bug, statusFilter) &&
      (project === "Todos los proyectos" || bug.project === project) &&
      (priority === "Todos" || bug.priority === priority) &&
      (severity === "Todos" || (bug.severity ?? "Media") === severity) &&
      assignmentMatches(bug.assigneeUserId, assignee) &&
      tagMatches(bug.tagIds, tag),
  );
}

export function filterCases<
  T extends {
    id: string;
    title: string;
    suite: string;
    status: string;
    assigneeUserId?: string | null;
    tagIds?: string[];
  },
>(
  cases: T[],
  {
    search = "",
    statusFilter = "Todos",
    assignee = "Todos",
    tag = "Todos",
  }: {
    search?: string;
    statusFilter?: string;
    assignee?: string;
    tag?: string;
  } = {},
) {
  return cases.filter(
    (item) =>
      matchesSearch(item, ["id", "title", "suite", "status"], search) &&
      matchesStatus(item, statusFilter) &&
      assignmentMatches(item.assigneeUserId, assignee) &&
      tagMatches(item.tagIds, tag),
  );
}

export function filterRuns<
  T extends {
    id: string;
    title: string;
    status: string;
    owner: string;
    ownerUserId?: string | null;
    tagIds?: string[];
    planId?: string | null;
  },
>(
  runs: T[],
  {
    search = "",
    statusFilter = "Todos",
    assignee = "Todos",
    tag = "Todos",
    plan = "Todos",
  }: {
    search?: string;
    statusFilter?: string;
    assignee?: string;
    tag?: string;
    plan?: string;
  } = {},
) {
  return runs.filter(
    (item) =>
      matchesSearch(item, ["id", "title", "status", "owner"], search) &&
      matchesStatus(item, statusFilter) &&
      assignmentMatches(item.ownerUserId, assignee) &&
      tagMatches(item.tagIds, tag) &&
      (plan === "Todos" || (plan === "Sin plan" ? !item.planId : item.planId === plan)),
  );
}

export function filterEvidence<T extends { name: string; type: string; related: string | null }>(
  evidence: T[],
  { search = "" }: { search?: string } = {},
) {
  return evidence.filter((item) => matchesSearch(item, ["name", "type", "related"], search));
}
