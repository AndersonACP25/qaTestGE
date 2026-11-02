import { formatCount } from "../utils/pluralization";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useOperationScope } from "./useOperationScope";
import type { MentionNotification } from "../../backend/src/models/collaboration.model";

export function useMentionNotifications(userId: string, projectId: string) {
  const captureScope = useOperationScope(userId, projectId);
  const [state, setState] = useState({
    scope: "",
    rows: [] as MentionNotification[],
    loading: true,
    error: "",
  });
  const [revision, setRevision] = useState(0);
  const [reading, setReading] = useState({ scope: "", id: "", message: "" });
  const pending = useRef(new Set<string>());
  const confirmed = useRef(new Map<string, string>());
  const scopeKey = `${userId}:${projectId}:`;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    const isCurrent = captureScope();
    setState((current) => ({
      scope: scopeKey,
      rows: current.scope === scopeKey ? current.rows : [],
      loading: true,
      error: "",
    }));
    void api<MentionNotification[]>(
      `/mention-notifications?projectId=${encodeURIComponent(projectId)}`,
      { signal: controller.signal },
    )
      .then((rows) => {
        if (isCurrent() && !controller.signal.aborted)
          setState({
            scope: scopeKey,
            rows: rows.map((row) => ({
              ...row,
              readAt: row.readAt ?? confirmed.current.get(scopeKey + row.id) ?? null,
            })),
            loading: false,
            error: "",
          });
      })
      .catch((cause: unknown) => {
        if (isCurrent() && !controller.signal.aborted)
          setState((current) => ({
            ...current,
            loading: false,
            error:
              cause instanceof Error ? cause.message : "No se pudieron cargar las notificaciones.",
          }));
      });
    return () => controller.abort();
  }, [userId, projectId, revision, captureScope, scopeKey]);
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(check, 15000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [refresh]);
  async function markRead(row: MentionNotification) {
    if (pending.current.has(scopeKey) || row.readAt) return;
    pending.current.add(scopeKey);
    const isCurrent = captureScope();
    setReading({ scope: scopeKey, id: row.id, message: "" });
    try {
      await api<void>(
        `/mention-notifications/${encodeURIComponent(row.id)}?projectId=${encodeURIComponent(projectId)}`,
        { method: "PATCH", body: "{}" },
      );
      if (!isCurrent()) return;
      confirmed.current.set(scopeKey + row.id, new Date().toISOString());
      // Cancel older reads of the list before they can reintroduce an unread item.
      setRevision((value) => value + 1);
      setState((current) =>
        current.scope === scopeKey
          ? {
              ...current,
              rows: current.rows.map((item) =>
                item.id === row.id ? { ...item, readAt: new Date().toISOString() } : item,
              ),
            }
          : current,
      );
      setReading({ scope: scopeKey, id: "", message: "Mención marcada como leída." });
    } catch (cause) {
      if (isCurrent())
        setState((current) => ({
          ...current,
          error:
            cause instanceof Error ? cause.message : "No se pudo marcar la mención como leída.",
        }));
    } finally {
      pending.current.delete(scopeKey);
      if (isCurrent()) setReading((current) => ({ ...current, id: "" }));
    }
  }
  async function markAllRead() {
    if (pending.current.has(scopeKey)) return;
    const ids = new Set(
      state.scope === scopeKey ? state.rows.filter((row) => !row.readAt).map((row) => row.id) : [],
    );
    pending.current.add(scopeKey);
    const isCurrent = captureScope();
    setReading({ scope: scopeKey, id: "all", message: "" });
    try {
      const result = await api<{ updated: number; readAt: string }>(
        `/mention-notifications/read-all?projectId=${encodeURIComponent(projectId)}`,
        { method: "PATCH", body: "{}" },
      );
      if (!isCurrent()) return;
      for (const id of ids) confirmed.current.set(scopeKey + id, result.readAt);
      setRevision((value) => value + 1);
      setState((current) =>
        current.scope === scopeKey
          ? {
              ...current,
              rows: current.rows.map((row) =>
                ids.has(row.id) ? { ...row, readAt: row.readAt ?? result.readAt } : row,
              ),
            }
          : current,
      );
      setReading({
        scope: scopeKey,
        id: "",
        message: `${formatCount(result.updated, "mención marcada como leída", "menciones marcadas como leídas")}.`,
      });
    } catch (cause) {
      if (isCurrent())
        setState((current) => ({
          ...current,
          error: cause instanceof Error ? cause.message : "No se pudieron marcar las menciones.",
        }));
    } finally {
      pending.current.delete(scopeKey);
      if (isCurrent()) setReading((current) => ({ ...current, id: "" }));
    }
  }
  const rows = state.scope === scopeKey ? state.rows : [];
  return {
    rows,
    loading: Boolean(projectId) && (state.scope !== scopeKey || state.loading),
    error: state.scope === scopeKey ? state.error : "",
    message: reading.scope === scopeKey ? reading.message : "",
    busyId: reading.scope === scopeKey ? reading.id : "",
    unread: rows.filter((row) => !row.readAt).length,
    refresh,
    markRead,
    markAllRead,
  };
}
export type MentionInbox = ReturnType<typeof useMentionNotifications>;
