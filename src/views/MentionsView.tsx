import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Alert from "../Alert";
import type {
  MentionNotification,
  ResourceTarget,
} from "../../backend/src/models/collaboration.model";
import { formatCount } from "../utils/pluralization";
export default function MentionsView({
  projectId,
  onOpen,
}: {
  projectId: string;
  onOpen: (target: ResourceTarget, signal: AbortSignal) => Promise<boolean>;
}) {
  const [rows, setRows] = useState<MentionNotification[]>([]),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const alive = useRef(true),
    manual = useRef(false),
    opening = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      opening.current?.abort();
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    void api<MentionNotification[]>(
      `/mention-notifications?projectId=${encodeURIComponent(projectId)}`,
      { signal: abort.signal },
    )
      .then((data) => {
        if (!abort.signal.aborted) {
          setRows(data);
          if (manual.current) {
            setMessage("Menciones actualizadas.");
            manual.current = false;
          }
        }
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : "No se pudieron cargar las menciones.");
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [projectId, revision]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") setRevision((v) => v + 1);
    };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [projectId]);
  async function open(row: MentionNotification) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    const controller = new AbortController();
    opening.current = controller;
    try {
      const opened = await onOpen(row.target, controller.signal);
      if (!opened || controller.signal.aborted || !alive.current) return;
      await api<void>(
        `/mention-notifications/${row.id}?projectId=${encodeURIComponent(projectId)}`,
        { method: "PATCH", body: "{}", signal: controller.signal },
      );
      if (alive.current) {
        setMessage("Mención marcada como leída.");
        setRevision((v) => v + 1);
      }
    } catch (e) {
      if (alive.current && !controller.signal.aborted)
        setError(e instanceof Error ? e.message : "No se pudo abrir la mención.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="collaboration mentions-view layout__stack">
      <div className="mentions-view__heading">
        <div>
          <h2 className="typography__section">Mis menciones</h2>
          <p>
            Avisos privados del proyecto. Se actualizan cada 15 segundos mientras esta vista está
            visible.
          </p>
        </div>
        <button
          className="workspace__secondary"
          disabled={loading || busy}
          onClick={() => {
            manual.current = true;
            setMessage("");
            setRevision((v) => v + 1);
          }}
        >
          Actualizar menciones
        </button>
      </div>
      <p className="typography__caption">
        {formatCount(
          rows.filter((r) => !r.readAt).length,
          "mención sin leer",
          "menciones sin leer",
        )}{" "}
        · Se muestran los últimos 100 avisos. No se envían correos.
      </p>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      {loading && !rows.length ? (
        <p role="status">Cargando menciones…</p>
      ) : (
        rows.map((r) => (
          <article className="collaboration__comment layout__panel layout__stack" key={r.id}>
            <strong>
              {r.authorName} te mencionó en {r.target.id}
            </strong>
            <p>
              {new Date(r.createdAt).toLocaleString("es")} · {r.readAt ? "Leída" : "Sin leer"}
            </p>
            <button className="workspace__secondary" disabled={busy} onClick={() => void open(r)}>
              {busy ? "Abriendo…" : "Abrir registro"}
            </button>
          </article>
        ))
      )}
      {!loading && !error && !rows.length && <p>No tienes menciones en este proyecto.</p>}
    </section>
  );
}
