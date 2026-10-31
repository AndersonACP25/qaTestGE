import { useEffect, useState, type FormEvent } from "react";
import Alert from "../Alert";
import { api, type Project } from "../api";

export default function ProjectsView({
  projects,
  onChanged,
}: {
  projects: Project[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [teams, setTeams] = useState<{ id: string; name: string; role: "owner" | "member" }[]>([]);
  const [teamId, setTeamId] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    void api<typeof teams>("/teams", { signal: abort.signal })
      .then((items) => {
        const owned = items.filter((item) => item.role === "owner");
        setTeams(owned);
        setTeamId((id) => (owned.some((item) => item.id === id) ? id : (owned[0]?.id ?? "")));
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los equipos.");
      });
    return () => abort.abort();
  }, []);
  function reset() {
    setEditing(null);
    setName("");
    setDescription("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(editing ? `/projects/${encodeURIComponent(editing.id)}` : "/projects", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ name, description, ...(editing ? {} : { teamId }) }),
      });
      setMessage(editing ? "Proyecto actualizado." : "Proyecto creado.");
      reset();
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el proyecto.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/projects/${encodeURIComponent(deleting.id)}`, { method: "DELETE", body: "{}" });
      setDeleting(null);
      setMessage("Proyecto eliminado.");
      if (editing?.id === deleting.id) reset();
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el proyecto.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="projects-view">
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <section className="projects-view__panel">
        <h2 className="typography__section">
          {editing ? `Editar ${editing.name}` : "Crear proyecto"}
        </h2>
        <p>
          El propietario crea proyectos. Los Admin del proyecto pueden editarlo o eliminarlo si está
          vacío.
        </p>
        <form className="projects-view__form" onSubmit={(event) => void save(event)}>
          {!editing && (
            <label className="workspace__field">
              Equipo propietario
              <select required value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                <option value="">Selecciona un equipo</option>
                {teams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="workspace__field">
            Nombre
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
            />
          </label>
          <label className="workspace__field">
            Descripción
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
            />
          </label>
          <div className="projects-view__actions">
            <button
              className="button button-primary"
              disabled={busy || (!editing && !teamId)}
              type="submit"
            >
              {editing ? "Guardar cambios" : "Crear proyecto"}
            </button>
            {editing && (
              <button
                type="button"
                className="workspace__secondary"
                onClick={reset}
                disabled={busy}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </section>
      <section className="projects-view__panel">
        <h2 className="typography__section">Proyectos disponibles</h2>
        {projects.length === 0 && <p>Aún no tienes proyectos.</p>}
        {projects.map((project) => (
          <article className="projects-view__item" key={project.id}>
            <div>
              <h3 className="typography__heading">{project.name}</h3>
              <p>{project.description || "Sin descripción."}</p>
            </div>
            <div className="projects-view__actions">
              <button
                type="button"
                className="workspace__secondary"
                disabled={busy || project.role !== "Admin"}
                onClick={() => {
                  setEditing(project);
                  setName(project.name);
                  setDescription(project.description);
                  setDeleting(null);
                  setError("");
                }}
              >
                Editar
              </button>
              <button
                type="button"
                className="workspace__danger"
                disabled={busy || project.role !== "Admin"}
                onClick={() => {
                  setDeleting(project);
                  setError("");
                }}
              >
                Eliminar
              </button>
            </div>
            {deleting?.id === project.id && (
              <div className="projects-view__confirm">
                <p>
                  ¿Eliminar {project.name}? Solo se pueden eliminar proyectos sin registros
                  vinculados.
                </p>
                <button
                  type="button"
                  className="workspace__danger"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  Confirmar eliminación
                </button>
                <button
                  type="button"
                  className="workspace__secondary"
                  disabled={busy}
                  onClick={() => setDeleting(null)}
                >
                  Cancelar
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
