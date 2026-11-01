import RichTextarea from "../components/RichTextarea";
import { resolvePlainMentions } from "../../backend/src/models/plain-mentions";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Alert from "../Alert";
import type {
  Activity,
  Comment,
  ProjectMember,
  ResourceTarget,
} from "../../backend/src/models/collaboration.model";
import { usePermissions } from "../controllers/ProjectPermissions";
import ActivityList from "./ProjectActivityView";
export function MentionText({ comment }: { comment: Comment }) {
  const parts = comment.body.split(/(@\[[^\]\r\n]{1,100}\]\(user:[1-9]\d{0,18}\))/g);
  return (
    <p className="collaboration__body">
      {parts.map((part, i) => {
        const match = /^@\[([^\]]+)\]\(user:(\d+)\)$/.exec(part);
        const member = match && comment.mentions.find((m) => m.id === match[2]);
        return member ? (
          <strong className="collaboration__mention" key={i}>
            @{member.name}
          </strong>
        ) : (
          part
        );
      })}
    </p>
  );
}
export default function CollaborationPanel({
  projectId,
  target,
  userId,
}: {
  projectId: string;
  target: ResourceTarget;
  userId: string;
}) {
  const { can, role } = usePermissions();
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<Comment | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const alive = useRef(true);
  const requestKey = useRef(crypto.randomUUID());
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const query = `projectId=${encodeURIComponent(projectId)}&kind=${target.kind}&resourceId=${encodeURIComponent(target.id)}`;
  useEffect(() => {
    let active = true;
    Promise.all([
      api<Comment[]>(`/comments?${query}`),
      api<ProjectMember[]>(`/project-members?projectId=${projectId}`),
      api<Activity[]>(`/activity?${query}`),
    ])
      .then(([c, m, a]) => {
        if (active) {
          setComments(c);
          setMembers(m);
          setActivity(a);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "No se pudo cargar la conversación.");
      });
    return () => {
      active = false;
    };
  }, [query, projectId, revision]);
  async function act(operation: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      if (alive.current) {
        setMessage(success);
        setRevision((v) => v + 1);
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "No se pudo guardar el comentario.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const tail = /(?:^|\s)@([^@\n]*)$/.exec(body)?.[1];
  const fragment =
    tail !== undefined && !tail.includes("[") && !tail.includes("]") ? tail : undefined;
  const suggestions =
    fragment === undefined
      ? []
      : members
          .filter((m) => m.name.toLocaleLowerCase().includes(fragment.toLocaleLowerCase()))
          .slice(0, 8);
  return (
    <section className="collaboration">
      <h3 className="typography__heading">Comentarios y actividad</h3>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      {can("comments.write") ? (
        <form
          className="collaboration__composer"
          onSubmit={(e) => {
            e.preventDefault();
            void act(
              async () => {
                if (
                  fragment !== undefined &&
                  suggestions.length > 0 &&
                  !members.some(
                    (m) => m.name.toLocaleLowerCase() === fragment.trim().toLocaleLowerCase(),
                  )
                )
                  throw new Error(
                    "Selecciona el nombre completo en las sugerencias para enviar la mención.",
                  );
                const resolved = resolvePlainMentions(body, members);
                if (editing)
                  await api<Comment>(`/comments/${editing.id}?projectId=${projectId}`, {
                    method: "PATCH",
                    body: JSON.stringify({ body: resolved, version: editing.version }),
                  });
                else
                  await api<Comment>(`/comments?projectId=${projectId}`, {
                    method: "POST",
                    headers: { "Idempotency-Key": requestKey.current },
                    body: JSON.stringify({ body: resolved, target }),
                  });
                if (alive.current) {
                  setBody("");
                  setEditing(null);
                  requestKey.current = crypto.randomUUID();
                }
              },
              editing ? "Comentario actualizado." : "Comentario publicado.",
            );
          }}
        >
          <label className="workspace__field">
            {editing ? "Editar comentario" : "Nuevo comentario"}
            <RichTextarea
              required
              aria-label={editing ? "Editar comentario" : "Nuevo comentario"}
              maxLength={5000}
              value={body}
              disabled={busy}
              placeholder="Escribe @ y selecciona un integrante para mencionarlo"
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          {suggestions.length > 0 && (
            <div className="collaboration__suggestions" aria-label="Sugerencias de menciones">
              {suggestions.map((m) => (
                <button
                  type="button"
                  className="workspace__secondary"
                  key={m.id}
                  disabled={busy}
                  onClick={() =>
                    setBody((v) =>
                      v.replace(
                        /@[^\]\n[]*$/,
                        `@[${m.name.replace(/[\]\r\n]/g, " ")}](user:${m.id}) `,
                      ),
                    )
                  }
                >
                  @{m.name}
                </button>
              ))}
            </div>
          )}
          <p className="collaboration__help">
            Selecciona una sugerencia o escribe el nombre completo y único después de @. Los avisos
            llegan a otras personas del proyecto; las automenciones no generan aviso.
          </p>
          <div className="collaboration__actions">
            <button className="button button-primary" disabled={busy}>
              {editing ? "Guardar comentario" : "Publicar comentario"}
            </button>
            {editing && (
              <button
                type="button"
                className="workspace__secondary"
                disabled={busy}
                onClick={() => {
                  setEditing(null);
                  setBody("");
                  requestKey.current = crypto.randomUUID();
                }}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      ) : (
        <p>Tu rol permite consultar esta conversación.</p>
      )}
      <button
        className="workspace__secondary"
        disabled={busy}
        onClick={() => setRevision((v) => v + 1)}
      >
        Actualizar conversación
      </button>
      <div className="collaboration__comments">
        {comments.map((c) => (
          <article className="collaboration__comment" key={c.id}>
            <header>
              <strong>{c.authorName}</strong> · {new Date(c.createdAt).toLocaleString("es")}
              {c.editedAt && " · editado"}
            </header>
            {c.deletedAt ? (
              <p>Comentario eliminado. El cambio permanece en el historial de actividad.</p>
            ) : (
              <>
                <MentionText comment={c} />
                {can("comments.write") && (c.authorId === userId || role === "Admin") && (
                  <div className="collaboration__actions">
                    <button
                      className="workspace__secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditing(c);
                        setBody(c.body);
                      }}
                    >
                      Editar comentario
                    </button>
                    <button
                      className="workspace__danger"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "¿Eliminar este comentario? El historial de auditoría se conserva.",
                          )
                        )
                          void act(async () => {
                            await api<Comment>(`/comments/${c.id}?projectId=${projectId}`, {
                              method: "DELETE",
                              body: JSON.stringify({ version: c.version }),
                            });
                          }, "Comentario eliminado.");
                      }}
                    >
                      Eliminar comentario
                    </button>
                  </div>
                )}
              </>
            )}
          </article>
        ))}
      </div>
      {!comments.length && <p>Aún no hay comentarios.</p>}
      <p className="collaboration__help">Se muestran los 100 comentarios más recientes.</p>
      <details className="collaboration__history">
        <summary>Ver historial de actividad del registro</summary>
        <ActivityList rows={activity} />
      </details>
    </section>
  );
}
