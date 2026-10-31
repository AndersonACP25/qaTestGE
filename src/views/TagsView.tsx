import { usePermissions } from "../controllers/ProjectPermissions";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Alert from "../Alert";
import { createTag, deleteTag, updateTag } from "../api";
import type { Tag } from "../types";

export default function TagsView({
  projectId,
  tags,
  onChanged,
}: {
  projectId: string;
  tags: Tag[];
  onChanged: () => void;
}) {
  const readOnly = !usePermissions().can("tags.write");
  const [editing, setEditing] = useState<Tag | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#7462df");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  function startEdit(tag: Tag) {
    setEditing(tag);
    setName(tag.name);
    setColor(tag.color);
    setError("");
  }

  function reset() {
    setEditing(null);
    setName("");
    setColor("#7462df");
    setError("");
  }

  useEffect(() => {
    setEditing(null);
    setName("");
    setColor("#7462df");
    setError("");
  }, [projectId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const input = { projectId, name: name.trim(), color };
      if (editing) await updateTag(editing.id, input);
      else await createTag(input);
      if (!alive.current) return;
      reset();
      setMessage(editing ? "Tag actualizado." : "Tag creado.");
      onChanged();
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : "No se pudo guardar el tag.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function remove(tag: Tag) {
    if (
      busy ||
      !window.confirm(
        `¿Eliminar el tag "${tag.name}"? También se eliminarán sus asignaciones, no los registros.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await deleteTag(tag.id, projectId);
      if (!alive.current) return;
      setMessage(`Tag «${tag.name}» eliminado.`);
      if (editing?.id === tag.id) reset();
      onChanged();
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : "No se pudo eliminar el tag.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  return (
    <section className="tags-view">
      {message && <Alert tone="success">{message}</Alert>}
      <form className="tags-view__form" onSubmit={(event) => void save(event)}>
        <fieldset className="permissions__group" disabled={readOnly || busy}>
          <h2 className="typography__section">{editing ? "Editar tag" : "Crear tag"}</h2>
          <label className="tags-view__field">
            Nombre
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={50}
              required
            />
          </label>
          <label className="tags-view__field">
            Color
            <span className="tags-view__color-input">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                aria-label="Color del tag"
              />
              <code>{color}</code>
            </span>
          </label>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="tags-view__actions">
            <button className="button button-primary" type="submit" disabled={busy || !name.trim()}>
              {busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear tag"}
            </button>
            {editing && (
              <button
                className="workspace__secondary"
                type="button"
                disabled={busy || readOnly}
                onClick={reset}
              >
                Cancelar
              </button>
            )}
          </div>
        </fieldset>
      </form>
      <section className="tags-view__list" aria-label="Tags del proyecto">
        <h2 className="typography__section">
          Tags del proyecto <span className="tags-view__count">{tags.length}</span>
        </h2>
        {!tags.length ? (
          <p className="workspace__notice">Todavía no hay tags en este proyecto.</p>
        ) : (
          tags.map((tag) => (
            <article className="tags-view__item" key={tag.id}>
              <span className="tags-view__swatch" style={{ backgroundColor: tag.color }} />
              <span className="tags-view__name">{tag.name}</span>
              <code>{tag.color}</code>
              <button
                type="button"
                className="workspace__secondary"
                disabled={busy || readOnly}
                onClick={() => startEdit(tag)}
              >
                Editar
              </button>
              <button
                type="button"
                className="workspace__danger"
                disabled={busy || readOnly}
                onClick={() => void remove(tag)}
              >
                Eliminar
              </button>
            </article>
          ))
        )}
      </section>
    </section>
  );
}
