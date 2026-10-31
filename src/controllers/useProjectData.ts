import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { loadProject } from "../api";
type ProjectData = Awaited<ReturnType<typeof loadProject>>;
const empty: ProjectData = { bugs: [], cases: [], runs: [], evidence: [] };

export function useProjectData(projectId: string, revision: number, enabled = true) {
  const [cache, setCache] = useState<Record<string, ProjectData>>({});
  const [status, setStatus] = useState({ scope: "", loading: true, error: "" });
  const setData = useCallback(
    (update: SetStateAction<ProjectData>) =>
      setCache((current) => ({
        ...current,
        [projectId]: typeof update === "function" ? update(current[projectId] ?? empty) : update,
      })),
    [projectId],
  );
  const setLoading = useCallback(
    (loading: boolean) =>
      setStatus((current) => ({
        scope: projectId,
        error: current.scope === projectId ? current.error : "",
        loading,
      })),
    [projectId],
  );
  const setError = useCallback(
    (error: string) =>
      setStatus((current) => ({
        scope: projectId,
        loading: current.scope === projectId ? current.loading : true,
        error,
      })),
    [projectId],
  );
  useEffect(() => {
    if (!projectId || !enabled) return;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    void loadProject(projectId, abort.signal)
      .then((items) => {
        if (!abort.signal.aborted) setData(items);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los datos.");
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [projectId, revision, enabled, setData, setError, setLoading]);
  return {
    data: cache[projectId] ?? empty,
    setData,
    loading: enabled && (status.scope === projectId ? status.loading : true),
    error: enabled && status.scope === projectId ? status.error : "",
    setLoading,
    setError,
  };
}
