function matchesSearch<T extends object>(item: T, fields: (keyof T)[], search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  return !normalizedSearch || fields.some((field) =>
    String(item[field] ?? "").toLowerCase().includes(normalizedSearch),
  );
}

function matchesStatus(item: { status: string }, statusFilter: string) {
  return statusFilter === "Todos" || item.status === statusFilter;
}

export function filterBugs<T extends {
  id: string;
  title: string;
  project: string;
  priority: string;
  status: string;
}>(
  bugs: T[],
  { search = "", statusFilter = "Todos", project = "Todos los proyectos" }: {
    search?: string;
    statusFilter?: string;
    project?: string;
  } = {},
) {
  return bugs.filter((bug) =>
    matchesSearch(bug, ["id", "title", "project", "status", "priority"], search)
    && matchesStatus(bug, statusFilter)
    && (project === "Todos los proyectos" || bug.project === project),
  );
}

export function filterCases<T extends { id: string; title: string; suite: string; status: string }>(cases: T[], { search = "", statusFilter = "Todos" }: {
  search?: string;
  statusFilter?: string;
} = {}) {
  return cases.filter((item) =>
    matchesSearch(item, ["id", "title", "suite", "status"], search)
    && matchesStatus(item, statusFilter),
  );
}

export function filterRuns<T extends { id: string; title: string; status: string; owner: string }>(runs: T[], { search = "", statusFilter = "Todos" }: {
  search?: string;
  statusFilter?: string;
} = {}) {
  return runs.filter((item) =>
    matchesSearch(item, ["id", "title", "status", "owner"], search)
    && matchesStatus(item, statusFilter),
  );
}

export function filterEvidence<T extends { name: string; type: string; related: string | null }>(evidence: T[], { search = "" }: { search?: string } = {}) {
  return evidence.filter((item) =>
    matchesSearch(item, ["name", "type", "related"], search),
  );
}
