import { useEffect, useState } from "react";
import { api, toRun } from "../api";
import type { ApiRun } from "../contracts/apiContracts";
import type { defaultListingFilters } from "../components/ListingFilters";
import { filterRuns } from "../utils/filterItems";

const pageSize = 50;

export function useRunListing(
  projectId: string,
  revision: number,
  page: number,
  filters: typeof defaultListingFilters,
) {
  const { search, statusFilter, assignee, tag, plan } = filters;
  const query = new URLSearchParams({
    projectId,
    summary: "true",
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
  });
  if (search.trim()) query.set("search", search.trim());
  if (statusFilter !== "Todos") query.set("status", statusFilter);
  if (assignee !== "Todos") query.set("assignee", assignee === "Sin asignar" ? "none" : assignee);
  if (tag !== "Todos") query.set("tag", tag === "Sin tags" ? "none" : tag);
  if (plan !== "Todos") query.set("plan", plan === "Sin plan" ? "none" : plan);
  const key = query.toString();
  const [state, setState] = useState({
    key: "",
    revision: -1,
    rows: [] as ReturnType<typeof toRun>[],
    total: 0,
    error: "",
  });
  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    let total: number | undefined;
    void api<ApiRun[]>(`/test-runs?${key}`, { signal: controller.signal }, (headers) => {
      const count = headers.get("X-Total-Count");
      if (count && /^\d+$/.test(count)) total = Number(count);
    })
      .then((items) => {
        if (controller.signal.aborted) return;
        const rows = items.map(toRun);
        if (total !== undefined) setState({ key, revision, rows, total, error: "" });
        else {
          const matches = filterRuns(rows, { search, statusFilter, assignee, tag, plan });
          setState({
            key,
            revision,
            rows: matches.slice((page - 1) * pageSize, page * pageSize),
            total: matches.length,
            error: "",
          });
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            revision,
            rows: [],
            total: 0,
            error:
              cause instanceof Error ? cause.message : "No se pudieron cargar las ejecuciones.",
          });
      });
    return () => controller.abort();
  }, [key, projectId, revision, page, search, statusFilter, assignee, tag, plan]);
  const current = state.key === key && state.revision === revision;
  return {
    rows: current ? state.rows : [],
    total: state.key === key ? state.total : 0,
    loading: Boolean(projectId) && !current,
    error: current ? state.error : "",
  };
}
