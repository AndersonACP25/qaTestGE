import ImportPanel from "./ImportPanel";
import { usePermissions } from "../controllers/ProjectPermissions";
import { useEffect, useState, type FormEvent } from "react";
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
    try {
      const input = { projectId, name: name.trim(), color };
      if (editing) await updateTag(editing.id, input);
      else await createTag(input);
      reset();
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el tag.");
    } finally {
      setBusy(false);
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
    try {
      await deleteTag(tag.id, projectId);
      if (editing?.id === tag.id) reset();
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el tag.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tags-view">
      {!readOnly && (
        <ImportPanel key={projectId} projectId={projectId} kind="tags" onChanged={onChanged} />
      )}
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
          Tags del proyecto <span>{tags.length}</span>
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
