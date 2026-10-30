import { useEffect, useState } from "react";
import { api } from "../api";
import type { BugWorkflow } from "../../backend/src/models/quality.model";
export function useBugWorkflow(projectId: string, revision = 0) {
  const [state, setState] = useState<{
    projectId: string;
    workflow: BugWorkflow | null;
    error: string;
  }>({ projectId: "", workflow: null, error: "" });
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    api<BugWorkflow>(`/bug-workflow?projectId=${encodeURIComponent(projectId)}`)
      .then((workflow) => {
        if (active) setState({ projectId, workflow, error: "" });
      })
      .catch((cause: unknown) => {
        if (active)
          setState({
            projectId,
            workflow: null,
            error: cause instanceof Error ? cause.message : "No se pudo cargar el flujo de bugs.",
          });
      });
    return () => {
      active = false;
    };
  }, [projectId, revision]);
  return state.projectId === projectId ? state : { projectId, workflow: null, error: "" };
}
