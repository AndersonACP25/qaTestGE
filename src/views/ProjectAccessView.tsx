import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../api";
import Alert from "../Alert";
import Dialog from "../Dialog";
import { usePermissions } from "../controllers/ProjectPermissions";
import { formatCount } from "../utils/pluralization";
import {
  projectRoles,
  type ProjectMember,
  type ProjectRole,
} from "../../backend/src/models/collaboration.model";
import "./project-access.css";

export default function ProjectAccessView({
  projectId,
  onChanged,
  refreshRevision = 0,
}: {
  projectId: string;
  onChanged: () => void;
  refreshRevision?: number;
}) {
  const { can } = usePermissions();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [candidateId, setCandidateId] = useState("");
  const [grantRole, setGrantRole] = useState<ProjectRole>("QA");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<{ member: ProjectMember; remove: boolean } | null>(null);
  const [editRole, setEditRole] = useState<ProjectRole>("QA");
  const alive = useRef(false),
    locked = useRef(false),
    manualRefresh = useRef(false);
  const allowed = can("access.manage");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!allowed) return;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    void api<ProjectMember[]>(
      `/project-members?projectId=${encodeURIComponent(projectId)}&candidates=true`,
      { signal: abort.signal },
    )
      .then((data) => {
        if (!abort.signal.aborted) {
          setMembers(data);
          if (manualRefresh.current) {
            setMessage("Accesos actualizados.");
            manualRefresh.current = false;
          }
          setCandidateId((id) => (data.some((m) => m.id === id && m.role === null) ? id : ""));
        }
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted) {
          manualRefresh.current = false;
          setError(e instanceof Error ? e.message : "No se pudieron cargar los accesos.");
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [projectId, revision, refreshRevision, allowed]);
  const candidates = members.filter((m) => !m.owner && m.role === null);
  const active = members.filter((m) => m.role !== null);
  const visible = active.filter((m) =>
    `${m.name} ${m.id} ${m.role}`
      .toLocaleLowerCase("es")
      .includes(search.trim().toLocaleLowerCase("es")),
  );
  async function save(member: ProjectMember, role: ProjectRole | null) {
    if (locked.current || loading || !allowed) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api<void>(
        `/project-members/${encodeURIComponent(member.id)}?projectId=${encodeURIComponent(projectId)}`,
        {
          method: "PUT",
          body: JSON.stringify({ role, revision: member.revision }),
        },
      );
      if (alive.current) {
        setMessage(
          role === null
            ? `Acceso de ${member.name} retirado de este proyecto.`
            : `Acceso de ${member.name} ${member.role === null ? "agregado" : "actualizado"} como ${role}.`,
        );
        setAction(null);
        setCandidateId("");
        setRevision((v) => v + 1);
        onChanged();
      }
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "No se pudo guardar el acceso.");
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function grant(event: FormEvent) {
    event.preventDefault();
    const candidate = candidates.find((m) => m.id === candidateId);
    if (candidate) void save(candidate, grantRole);
  }
  if (!allowed)
    return <Alert tone="warning">Solo Admin puede administrar los accesos del proyecto.</Alert>;
  return (
    <section className="project-access layout__stack">
      <header className="project-access__heading">
        <div className="layout__stack">
          <h2 className="typography__section">Accesos al proyecto</h2>
          <p>Agrega integrantes del equipo, cambia sus roles o retira su acceso a este proyecto.</p>
        </div>
        <button
          className="workspace__secondary"
          disabled={loading || busy}
          onClick={() => {
            manualRefresh.current = true;
            setMessage("");
            setRevision((v) => v + 1);
          }}
        >
          Actualizar accesos
        </button>
      </header>
      {error && !action && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      {loading && <p role="status">Cargando accesos…</p>}
      <form className="project-access__create layout__inset layout__stack" onSubmit={grant}>
        <h3 className="typography__heading">Agregar usuario al proyecto</h3>
        <p>
          Selecciona un integrante registrado y activo del equipo. Los nuevos integrantes se
          incorporan desde Equipos.
        </p>
        <div className="project-access__fields">
          <label className="workspace__field">
            Usuario del equipo
            <select
              required
              value={candidateId}
              disabled={loading || busy || !candidates.length}
              onChange={(e) => setCandidateId(e.target.value)}
            >
              <option value="">Selecciona un usuario sin acceso</option>
              {candidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · #{m.id}
                </option>
              ))}
            </select>
          </label>
          <label className="workspace__field">
            Rol inicial
            <select
              value={grantRole}
              disabled={loading || busy}
              onChange={(e) => {
                const role = projectRoles.find((r) => r === e.target.value);
                if (role) setGrantRole(role);
              }}
            >
              {projectRoles.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </label>
          <button className="button button-primary" disabled={loading || busy || !candidateId}>
            {busy ? "Guardando…" : "Agregar usuario"}
          </button>
        </div>
        {!loading && !error && !candidates.length && (
          <p className="typography__caption">
            Todos los integrantes activos del equipo ya tienen acceso.
          </p>
        )}
      </form>
      <details className="project-access__roles layout__inset">
        <summary>Qué permite cada rol</summary>
        <p>
          Admin administra configuración y accesos. QA gestiona recursos de prueba. Dev gestiona
          bugs, evidencias y comentarios. Solo lectura consulta y descarga.
        </p>
      </details>
      <div className="project-access__list-heading">
        <h3 className="typography__heading">Usuarios con acceso</h3>
        <p className="typography__caption">
          {formatCount(active.length, "usuario con acceso", "usuarios con acceso")}
        </p>
      </div>
      <label className="workspace__field">
        Buscar usuario del proyecto
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre, identificador o rol"
        />
      </label>
      <div className="project-access__list">
        {visible.map((m) => (
          <article
            className="project-access__member layout__inset layout__stack"
            key={m.id}
            aria-label={`Acceso de ${m.name}`}
          >
            <div className="layout__stack">
              <h4 className="typography__heading">{m.name}</h4>
              <p className="typography__caption">ID de usuario: {m.id}</p>
            </div>
            <span
              className={`role-badge role-badge--${m.role === "Solo lectura" ? "reader" : m.role?.toLowerCase()}`}
            >
              {m.role}
            </span>
            {m.owner ? (
              <p className="typography__caption">Propietario · Admin permanente</p>
            ) : (
              <div className="layout__actions">
                <button
                  className="workspace__secondary"
                  disabled={loading || busy}
                  onClick={() => {
                    setEditRole(m.role ?? "QA");
                    setAction({ member: m, remove: false });
                    setError("");
                  }}
                >
                  Editar rol
                </button>
                <button
                  className="workspace__danger"
                  disabled={loading || busy}
                  onClick={() => {
                    setAction({ member: m, remove: true });
                    setError("");
                  }}
                >
                  Retirar acceso
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {!loading && !visible.length && <p>No se encontraron usuarios con ese filtro.</p>}
      {action && (
        <Dialog
          title={action.remove ? "Retirar acceso al proyecto" : "Editar rol del proyecto"}
          onClose={() => {
            if (!busy) setAction(null);
          }}
        >
          <form
            className="project-access__editor layout__stack"
            onSubmit={(event) => {
              event.preventDefault();
              void save(action.member, action.remove ? null : editRole);
            }}
          >
            <p>
              <strong>{action.member.name}</strong> · ID {action.member.id}
            </p>
            {action.remove ? (
              <p>
                Se retirará su acceso a este proyecto. Su cuenta y sus accesos a otros proyectos se
                conservan. Reasigna sus bugs y casos antes de continuar.
              </p>
            ) : (
              <label className="workspace__field">
                Rol de {action.member.name}
                <select
                  value={editRole}
                  disabled={busy}
                  onChange={(e) => {
                    const role = projectRoles.find((r) => r === e.target.value);
                    if (role) setEditRole(role);
                  }}
                >
                  {projectRoles.map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </label>
            )}
            {error && <Alert tone="error">{error}</Alert>}
            <div className="layout__actions">
              <button
                className={action.remove ? "workspace__danger" : "button button-primary"}
                disabled={loading || busy || (!action.remove && editRole === action.member.role)}
              >
                {busy ? "Guardando…" : action.remove ? "Confirmar retiro" : "Guardar rol"}
              </button>
              <button
                className="workspace__secondary"
                type="button"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
