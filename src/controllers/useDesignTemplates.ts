import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import {
  designTemplatesSchema,
  emptyDesignTemplates,
  type DesignTemplates,
} from "../../backend/src/models/design-templates.model";
import { useOperationScope } from "./useOperationScope";

export function useDesignTemplates(userId: string, projectId: string) {
  const key = `${userId}:${projectId}`;
  const path = `/design-templates?projectId=${encodeURIComponent(projectId)}`;
  const capture = useOperationScope(userId, projectId);
  const [state, setState] = useState<{ key: string; data?: DesignTemplates; error?: string }>({
    key: "",
  });
  const [reload, setReload] = useState(0);
  const pending = useRef(new Set<string>());
  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void api<DesignTemplates>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            error: cause instanceof Error ? cause.message : "No se pudieron cargar las plantillas.",
          });
      });
    return () => controller.abort();
  }, [key, path, projectId, reload]);
  const current = state.key === key ? state : undefined;

  async function save(next: DesignTemplates) {
    if (!current?.data || pending.current.has(key))
      throw new Error("Espera a que termine la operación de plantillas.");
    const parsed = designTemplatesSchema.safeParse(next);
    if (!parsed.success)
      throw new Error("Revisa los campos, los pasos y los límites de plantillas antes de guardar.");
    const isCurrent = capture();
    pending.current.add(key);
    try {
      const data = await api<DesignTemplates>(path, {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      });
      if (isCurrent()) setState({ key, data });
    } finally {
      pending.current.delete(key);
    }
  }
  return {
    data: current?.data ?? emptyDesignTemplates,
    loading: Boolean(projectId) && !current,
    error: current?.error ?? "",
    save,
    refresh: () => {
      if (pending.current.has(key)) return;
      setState({ key: "" });
      setReload((value) => value + 1);
    },
  };
}
export type DesignTemplatesController = ReturnType<typeof useDesignTemplates>;
