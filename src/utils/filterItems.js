function matchesSearch(item, fields, search) {
  const normalizedSearch = search.trim().toLowerCase();
  return !normalizedSearch || fields.some((field) =>
    String(item[field] ?? "").toLowerCase().includes(normalizedSearch),
  );
}

function matchesStatus(item, statusFilter) {
  return statusFilter === "Todos" || item.status === statusFilter;
}

export function filterBugs(
  bugs,
  { search = "", statusFilter = "Todos", project = "Todos los proyectos" } = {},
) {
  return bugs.filter((bug) =>
    matchesSearch(bug, ["id", "title", "project", "status", "priority"], search)
    && matchesStatus(bug, statusFilter)
    && (project === "Todos los proyectos" || bug.project === project),
  );
}

export function filterCases(cases, { search = "", statusFilter = "Todos" } = {}) {
  return cases.filter((item) =>
    matchesSearch(item, ["id", "title", "suite", "status"], search)
    && matchesStatus(item, statusFilter),
  );
}

export function filterRuns(runs, { search = "", statusFilter = "Todos" } = {}) {
  return runs.filter((item) =>
    matchesSearch(item, ["id", "title", "status", "owner"], search)
    && matchesStatus(item, statusFilter),
  );
}

export function filterEvidence(evidence, { search = "" } = {}) {
  return evidence.filter((item) =>
    matchesSearch(item, ["name", "type", "related"], search),
  );
}
