import { useEffect, useRef, useState } from "react";
import Alert from "../Alert";
import type {
  MentionNotification,
  ResourceTarget,
} from "../../backend/src/models/collaboration.model";
import type { MentionInbox } from "../controllers/useMentionNotifications";
import { formatCount } from "../utils/pluralization";
import { Icon } from "../components/RecordPrimitives";
export const mentionKindLabels = { bug: "Bug", case: "Caso de prueba", run: "Test Run" };
export default function MentionsView({
  inbox,
  onOpen,
}: {
  inbox: MentionInbox;
  onOpen: (target: ResourceTarget, signal: AbortSignal) => Promise<boolean>;
}) {
  const [filter, setFilter] = useState("Todas");
  const [openingId, setOpeningId] = useState("");
  const [openError, setOpenError] = useState("");
  const opening = useRef<AbortController | null>(null);
  useEffect(() => () => opening.current?.abort(), []);
  async function open(row: MentionNotification) {
    if (openingId) return;
    const controller = new AbortController();
    opening.current = controller;
    setOpeningId(row.id);
    setOpenError("");
    try {
      await onOpen(row.target, controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted)
        setOpenError(cause instanceof Error ? cause.message : "No se pudo abrir la mención.");
    } finally {
      if (!controller.signal.aborted) setOpeningId("");
    }
  }
  const rows = inbox.rows.filter(
    (row) => filter === "Todas" || (filter === "Sin leer" ? !row.readAt : Boolean(row.readAt)),
  );
  return (
    <section className="mentions-view" aria-label="Bandeja de menciones">
      <header className="mentions-view__header">
        <div className="mentions-view__counter">
          <Icon name="bell" size={24} />
          <strong>{inbox.unread}</strong>
          <span>sin leer</span>
        </div>
        <div className="mentions-view__header-actions">
          <button
            className="mentions-view__read-button"
            disabled={inbox.loading || Boolean(inbox.busyId) || !inbox.rows.length}
            onClick={() => void inbox.markAllRead()}
          >
            {inbox.busyId === "all" ? "Marcando…" : "Marcar todas como leídas"}
          </button>
          <button className="workspace__secondary" disabled={inbox.loading} onClick={inbox.refresh}>
            Actualizar menciones
          </button>
        </div>
      </header>
      <div className="mentions-view__filters" role="group" aria-label="Filtrar menciones">
        {["Todas", "Sin leer", "Leídas"].map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value}
          </button>
        ))}
        <span>{formatCount(inbox.rows.length, "mención", "menciones")}</span>
      </div>
      {(inbox.error || openError) && <Alert tone="error">{inbox.error || openError}</Alert>}
      {inbox.message && <Alert tone="success">{inbox.message}</Alert>}
      {inbox.loading && !inbox.rows.length ? (
        <p role="status">Cargando menciones…</p>
      ) : (
        <div className="mentions-view__list">
          {rows.map((row) => (
            <article
              className={`mentions-view__card${row.readAt ? " mentions-view__card--read" : ""}`}
              key={row.id}
            >
              <span className="mentions-view__avatar" aria-hidden="true">
                {row.authorName.slice(0, 2).toLocaleUpperCase("es")}
              </span>
              <div className="mentions-view__content">
                <div className="mentions-view__meta">
                  <span className="mentions-view__kind">{mentionKindLabels[row.target.kind]}</span>
                  <span
                    className={`mentions-view__state${row.readAt ? " mentions-view__state--read" : ""}`}
                  >
                    {row.readAt ? "Leída" : "Sin leer"}
                  </span>
                </div>
                <strong>
                  {row.authorName} te mencionó en {row.target.id}
                </strong>
                <time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString("es")}</time>
              </div>
              <div className="mentions-view__actions">
                <button
                  type="button"
                  className="workspace__secondary"
                  disabled={Boolean(openingId)}
                  onClick={() => void open(row)}
                >
                  {openingId === row.id ? "Abriendo…" : "Abrir registro"}
                </button>
                <button
                  type="button"
                  className="mentions-view__read-button"
                  disabled={Boolean(inbox.busyId) || Boolean(row.readAt)}
                  onClick={() => void inbox.markRead(row)}
                >
                  {inbox.busyId === row.id
                    ? "Marcando…"
                    : row.readAt
                      ? "Leída"
                      : "Marcar como leída"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!inbox.loading && !inbox.error && !rows.length && (
        <div className="mentions-view__empty">
          <Icon name="bell" size={32} />
          <h2 className="typography__heading">
            {inbox.rows.length
              ? "Sin menciones en este filtro"
              : "No tienes menciones en este proyecto."}
          </h2>
          <p>Las menciones a tu usuario aparecerán aquí.</p>
        </div>
      )}
    </section>
  );
}
