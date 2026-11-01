import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Alert from "../Alert";
import { formatCount } from "../utils/pluralization";
import type { Activity } from "../../backend/src/models/collaboration.model";
const labels: Record<string, string> = {
  requirements: "Requisito",
  requirement_cases: "Casos del requisito",
  bug_test_cases: "Vínculo caso/bug",
  bugs: "Bug",
  test_cases: "Caso",
  test_case_steps: "Pasos del caso",
  test_case_attachments: "Adjunto",
  test_runs: "Ejecución",
  test_run_results: "Resultado",
  evidence: "Evidencia",
  evidence_links: "Vínculo de evidencia",
  tags: "Tag",
  test_plans: "Plan",
  test_plan_cases: "Casos del plan",
  project_bug_workflows: "Flujo de bugs",
  project_members: "Acceso al proyecto",
  comments: "Comentario",
  projects: "Proyecto",
  bug_tags: "Tags del bug",
  test_case_tags: "Tags del caso",
  test_run_tags: "Tags de ejecución",
};
function fields(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}
const fieldLabels: Record<string, string> = {
  code: "Código",
  test_case_id: "Caso vinculado",
  bug_id: "Bug vinculado",
  title: "Título",
  body: "Comentario",
  status: "Estado",
  role: "Rol",
  lifecycle: "Estado documental",
  test_type: "Tipo de prueba",
  severity: "Severidad",
  priority: "Prioridad",
  environment: "Entorno",
  affected_version: "Versión afectada",
  notes: "Notas",
  action: "Acción",
  expected_result: "Resultado esperado",
  suite: "Suite",
  preconditions: "Precondiciones",
  name: "Nombre",
  description: "Descripción",
  owner: "Responsable",
  version: "Versión",
  states: "Estados",
  transitions: "Transiciones",
  closed_states: "Estados resueltos",
  deleted_at: "Fecha de eliminación",
  assignee_user_id: "Responsable QA",
  user_id: "Integrante",
};
export default function ActivityList({ rows }: { rows: Activity[] }) {
  return (
    <ul className="collaboration__activity">
      {[...rows]
        .sort(
          (a, b) =>
            Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
            b.id.localeCompare(a.id, "es", { numeric: true }),
        )
        .map((row) => {
          const [table, operation] = row.action.split(".");
          const before = fields(row.before);
          const after = fields(row.after);
          const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
            (k) => fieldLabels[k] && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
          );
          return (
            <li className="project-activity__event" key={row.id}>
              <p className="project-activity__event-heading">
                <strong>{row.actorName}</strong> · {labels[table] ?? "Registro"}{" "}
                {operation === "insert"
                  ? "creado"
                  : operation === "delete"
                    ? "eliminado"
                    : "actualizado"}{" "}
                · {row.resourceId}
              </p>
              <time className="project-activity__time" dateTime={row.createdAt}>
                {new Date(row.createdAt).toLocaleString("es")}
              </time>
              {keys.length > 0 && (
                <details>
                  <summary>Ver cambios</summary>
                  <dl className="project-activity__changes">
                    {keys.map((k) => (
                      <div className="collaboration__change" key={k}>
                        <dt>{fieldLabels[k]}</dt>
                        <dd>
                          Antes:{" "}
                          {before[k] === undefined
                            ? "—"
                            : typeof before[k] === "string"
                              ? before[k]
                              : JSON.stringify(before[k])}
                        </dd>
                        <dd>
                          Después:{" "}
                          {after[k] === undefined
                            ? "—"
                            : typeof after[k] === "string"
                              ? after[k]
                              : JSON.stringify(after[k])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </li>
          );
        })}
      {!rows.length && <li>No hay actividad registrada.</li>}
    </ul>
  );
}
export function ProjectActivityView({
  projectId,
  refreshRevision = 0,
}: {
  projectId: string;
  refreshRevision?: number;
}) {
  const [rows, setRows] = useState<Activity[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    setMessage("");
    void api<Activity[]>(`/activity?projectId=${encodeURIComponent(projectId)}`, {
      signal: abort.signal,
    })
      .then((data) => {
        if (!abort.signal.aborted) {
          setRows(data);
          setMore(data.length === 50);
          if (revision) setMessage("Actividad actualizada.");
        }
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : "No se pudo cargar la actividad.");
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [projectId, revision, refreshRevision]);
  async function next() {
    if (busy || !rows.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await api<Activity[]>(
        `/activity?projectId=${encodeURIComponent(projectId)}&before=${rows.at(-1)!.id}`,
      );
      if (alive.current) {
        setRows((v) => [...v, ...data]);
        setMore(data.length === 50);
        setMessage(
          data.length ? "Actividad anterior cargada." : "Llegaste al inicio del historial.",
        );
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "No se pudo cargar la actividad.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const visible = rows.filter((r) =>
    `${r.actorName} ${r.resourceId} ${labels[r.action.split(".")[0]] ?? r.kind}`
      .toLocaleLowerCase("es")
      .includes(search.trim().toLocaleLowerCase("es")),
  );
  return (
    <section className="project-activity">
      <header className="project-activity__heading">
        <div>
          <h2 className="typography__section">Actividad y auditoría del proyecto</h2>
          <p>
            Cambios confirmados, con su autor, fecha y detalle. El historial se conserva desde la
            migración 014.
          </p>
        </div>
        <button
          className="workspace__secondary"
          disabled={loading || busy}
          onClick={() => setRevision((v) => v + 1)}
        >
          Actualizar actividad
        </button>
      </header>
      <div className="project-activity__summary">
        <div>
          <span>Eventos cargados</span>
          <strong>{rows.length}</strong>
        </div>
        <div>
          <span>Participantes en esta vista</span>
          <strong>{new Set(rows.map((r) => r.actorId ?? "system")).size}</strong>
        </div>
        <div>
          <span>Último cambio cargado</span>
          <strong>
            {rows[0] ? new Date(rows[0].createdAt).toLocaleString("es") : "Sin actividad"}
          </strong>
        </div>
      </div>
      <label className="workspace__field">
        Buscar en la actividad cargada
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Autor, recurso o identificador"
        />
      </label>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      {loading ? (
        <p role="status">Cargando actividad…</p>
      ) : (
        <>
          <p className="typography__caption">
            {formatCount(visible.length, "evento visible", "eventos visibles")} · La búsqueda se
            limita a las páginas cargadas.
          </p>
          <ActivityList rows={visible} />
        </>
      )}
      {more && rows.length > 0 && (
        <button
          className="workspace__secondary"
          disabled={busy || loading}
          onClick={() => void next()}
        >
          {busy ? "Cargando…" : "Cargar actividad anterior"}
        </button>
      )}
    </section>
  );
}
