import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Alert from "../Alert";
import type { Activity } from "../../backend/src/models/collaboration.model";
const labels: Record<string, string> = {
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
    <ol className="collaboration__activity">
      {rows.map((row) => {
        const [table, operation] = row.action.split(".");
        const before = fields(row.before);
        const after = fields(row.after);
        const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
          (k) => fieldLabels[k] && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
        );
        return (
          <li key={row.id}>
            <p>
              <strong>{row.actorName}</strong> · {labels[table] ?? "Registro"}{" "}
              {operation === "insert"
                ? "creado"
                : operation === "delete"
                  ? "eliminado"
                  : "actualizado"}{" "}
              · {row.resourceId}
            </p>
            <time>{new Date(row.createdAt).toLocaleString("es")}</time>
            {keys.length > 0 && (
              <details>
                <summary>Ver cambios</summary>
                <dl>
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
    </ol>
  );
}
export function ProjectActivityView({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Activity[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(true);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    api<Activity[]>(`/activity?projectId=${projectId}`)
      .then((data) => {
        if (active) {
          setRows(data);
          setMore(data.length === 50);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "No se pudo cargar la actividad.");
      });
    return () => {
      active = false;
    };
  }, [projectId]);
  async function next() {
    setBusy(true);
    setError("");
    try {
      const data = await api<Activity[]>(
        `/activity?projectId=${projectId}&before=${rows.at(-1)!.id}`,
      );
      if (alive.current) {
        setRows((v) => [...v, ...data]);
        setMore(data.length === 50);
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "No se pudo cargar la actividad.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="collaboration">
      <h2 className="typography__section">Actividad y auditoría del proyecto</h2>
      <p>
        Registro persistente de cambios confirmados. Las operaciones fallidas se revierten y no
        generan actividad. El historial comienza con la migración 014.
      </p>
      {error && <Alert tone="error">{error}</Alert>}
      <ActivityList rows={rows} />
      {more && rows.length > 0 && (
        <button className="workspace__secondary" disabled={busy} onClick={() => void next()}>
          Cargar actividad anterior
        </button>
      )}
    </section>
  );
}
