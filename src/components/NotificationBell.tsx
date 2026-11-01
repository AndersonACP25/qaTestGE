import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./RecordPrimitives";
import Alert from "../Alert";
import type { MentionInbox } from "../controllers/useMentionNotifications";
import { mentionKindLabels } from "../views/MentionsView";
export default function NotificationBell({
  inbox,
  onViewAll,
}: {
  inbox: MentionInbox;
  onViewAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const click = (event: MouseEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="notification-bell" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="notification-bell__trigger"
        aria-label={`Notificaciones${inbox.unread ? `, ${inbox.unread} sin leer` : ""}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (!open) inbox.refresh();
          setOpen((value) => !value);
        }}
      >
        <Icon name="bell" size={21} />
        {inbox.unread > 0 && (
          <span className="notification-bell__badge" aria-hidden="true">
            {inbox.unread}
          </span>
        )}
      </button>
      {open && (
        <section
          id={id}
          className="notification-bell__panel"
          aria-label="Notificaciones del proyecto"
        >
          <header>
            <strong>Notificaciones</strong>
            <button
              className="workspace__secondary"
              type="button"
              aria-label="Cerrar notificaciones"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              ×
            </button>
          </header>
          {inbox.error && <Alert tone="error">{inbox.error}</Alert>}
          {inbox.loading && !inbox.rows.length && <p role="status">Cargando…</p>}
          {!inbox.loading && !inbox.rows.length && <p>No tienes notificaciones.</p>}
          <div className="notification-bell__list">
            {inbox.rows.slice(0, 5).map((row) => (
              <article
                key={row.id}
                className={`notification-bell__item${row.readAt ? " notification-bell__item--read" : ""}`}
              >
                <span>
                  {mentionKindLabels[row.target.kind]} · {row.target.id}
                </span>
                <strong>{row.authorName} te mencionó</strong>
                <time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString("es")}</time>
                {!row.readAt && (
                  <button
                    className="mentions-view__read-button"
                    type="button"
                    disabled={Boolean(inbox.busyId)}
                    onClick={() => void inbox.markRead(row)}
                  >
                    {inbox.busyId === row.id ? "Marcando…" : "Marcar como leída"}
                  </button>
                )}
              </article>
            ))}
          </div>
          <button
            className="notification-bell__view-all"
            type="button"
            onClick={() => {
              setOpen(false);
              onViewAll();
            }}
          >
            Ver todas las menciones →
          </button>
        </section>
      )}
    </div>
  );
}
