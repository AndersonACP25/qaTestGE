import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Alert from "../Alert";
import {
  projectRoles,
  type ProjectMember,
  type ProjectRole,
} from "../../backend/src/models/collaboration.model";
export default function ProjectAccessView({
  projectId,
  onChanged,
}: {
  projectId: string;
  onChanged: () => void;
}) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    api<ProjectMember[]>(`/project-members?projectId=${projectId}&candidates=true`)
      .then((data) => {
        if (active) setMembers(data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "No se pudieron cargar los accesos.");
      });
    return () => {
      active = false;
    };
  }, [projectId, revision]);
  async function save(m: ProjectMember, value: string) {
    if (!window.confirm(`¿Cambiar el acceso de ${m.name} a ${value || "Sin acceso"}?`)) return;
    setBusy(true);
    setError("");
    try {
      await api<void>(`/project-members/${m.id}?projectId=${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ role: value ? (value as ProjectRole) : null, revision: m.revision }),
      });
      if (alive.current) {
        setRevision((v) => v + 1);
        onChanged();
      }
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "No se pudo cambiar el acceso.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="collaboration">
      <h2 className="typography__section">Accesos al proyecto</h2>
      <p>
        Admin administra configuración y accesos. QA gestiona recursos de prueba. Dev gestiona bugs,
        evidencias y comentarios. Solo lectura consulta. Las invitaciones al equipo requieren una
        asignación posterior a cada proyecto.
      </p>
      {error && <Alert tone="error">{error}</Alert>}
      {members.map((m) => (
        <article className="collaboration__comment" key={m.id}>
          <strong>{m.name}</strong>
          {m.owner ? (
            <p>Propietario · Admin permanente</p>
          ) : (
            <label className="workspace__field">
              Rol de {m.name}
              <select
                value={m.role ?? ""}
                disabled={busy}
                onChange={(e) => void save(m, e.target.value)}
              >
                <option value="">Sin acceso</option>
                {projectRoles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          )}
        </article>
      ))}
    </section>
  );
}
