import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Alert from "../Alert";
import type {
  MentionNotification,
  ResourceTarget,
} from "../../backend/src/models/collaboration.model";
export default function MentionsView({
  projectId,
  onOpen,
}: {
  projectId: string;
  onOpen: (target: ResourceTarget) => void;
}) {
  const [rows, setRows] = useState<MentionNotification[]>([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    api<MentionNotification[]>(`/mention-notifications?projectId=${projectId}`)
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e: unknown) => {
        if (active)
          setError(e instanceof Error ? e.message : "No se pudieron cargar las menciones.");
      });
    return () => {
      active = false;
    };
  }, [projectId, revision]);
  async function open(row: MentionNotification) {
    try {
      await api<void>(`/mention-notifications/${row.id}?projectId=${projectId}`, {
        method: "PATCH",
        body: "{}",
      });
      if (alive.current) {
        setMessage("Mención marcada como leída.");
        setRevision((v) => v + 1);
        onOpen(row.target);
      }
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "No se pudo abrir la mención.");
    }
  }
  return (
    <section className="collaboration">
      <h2 className="typography__section">Mis menciones</h2>
      <p>Avisos dentro del proyecto, sin envío de correos. Se muestran los 100 más recientes.</p>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <button className="workspace__secondary" onClick={() => setRevision((v) => v + 1)}>
        Actualizar menciones
      </button>
      {rows.map((r) => (
        <article className="collaboration__comment" key={r.id}>
          <strong>{r.authorName}</strong> te mencionó en {r.target.id}
          <p>
            {new Date(r.createdAt).toLocaleString("es")} · {r.readAt ? "Leída" : "Sin leer"}
          </p>
          <button className="workspace__secondary" onClick={() => void open(r)}>
            Abrir registro
          </button>
        </article>
      ))}
      {!rows.length && <p>No tienes menciones en este proyecto.</p>}
    </section>
  );
}
