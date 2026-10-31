import { useEffect, useState } from "react";
import { api } from "../api";
import type { AnalyticsData } from "../contracts/analyticsContracts";
export function useAnalytics(projectId: string, from: string, to: string) {
  const [state, setState] = useState<{ scope: string; data: AnalyticsData | null; error: string }>({
    scope: "",
    data: null,
    error: "",
  });
  const scope = JSON.stringify([projectId, from, to]);
  useEffect(() => {
    const abort = new AbortController();
    void api<AnalyticsData>(
      `/analytics?projectId=${encodeURIComponent(projectId)}&from=${from}&to=${to}`,
      { signal: abort.signal },
    )
      .then((data) => {
        if (!abort.signal.aborted) setState({ scope, data, error: "" });
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted)
          setState({
            scope,
            data: null,
            error: e instanceof Error ? e.message : "No se pudo cargar la analítica.",
          });
      });
    return () => abort.abort();
  }, [scope, projectId, from, to]);
  return state.scope === scope ? state : { scope, data: null, error: "" };
}
export function defaultRange() {
  return {
    from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  };
}
