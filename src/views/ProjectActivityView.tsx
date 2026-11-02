import AuditTable from "./AuditTable";
import { exportTable } from "../utils/exportTable";
import type { ExportFormat } from "../utils/exportRecord";
import { useOperationScope } from "../controllers/useOperationScope";
import AuditSettingsPanel from "./AuditSettingsPanel";
import {
  auditProfiles,
  auditKinds,
  auditFiltersSchema,
  type AuditFilters,
  type AuditSettings,
} from "../../backend/src/models/audit.model";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Alert from "../Alert";
import { formatCount } from "../utils/pluralization";
import type { Activity } from "../../backend/src/models/collaboration.model";
const labels: Record<string, string> = {
  project_audit_settings: "Configuración de auditoría",
  users: "Usuario",
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
  profile: "Perfil",
  detail: "Detalle",
  page_size: "Eventos por página",
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
export default function ActivityList({
  rows,
  detailed = true,
}: {
  rows: Activity[];
  detailed?: boolean;
}) {
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
                {operation === "insert" || operation === "provision"
                  ? "creado"
                  : operation === "delete"
                    ? "eliminado"
                    : "actualizado"}{" "}
                · {row.resourceId}
              </p>
              <time className="project-activity__time" dateTime={row.createdAt}>
                {new Date(row.createdAt).toLocaleString("es")}
              </time>
              {detailed && keys.length > 0 && (
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
  const [pages, setPages] = useState<Activity[][]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [rows, setRows] = useState<Activity[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<AuditSettings | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({ profile: "General", limit: 50 });
  const query = new URLSearchParams({ projectId });
  for (const [key, value] of Object.entries(filters))
    if (value !== undefined && value !== "") query.set(key, String(value));
  const queryString = query.toString();
  const captureScope = useOperationScope(
    projectId,
    `${queryString}:${revision}:${refreshRevision}`,
  );
  const [settingsRevision, setSettingsRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    void api<AuditSettings>(`/audit-settings?projectId=${encodeURIComponent(projectId)}`, {
      signal: abort.signal,
    })
      .then((data) => {
        if (!abort.signal.aborted) {
          setSettings(data);
          setFilters({ profile: data.profile, limit: data.pageSize });
        }
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar la configuración.");
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [projectId, settingsRevision]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!settings) return;
    setBusy(false);
    const abort = new AbortController();
    setLoading(true);
    setError("");
    setMessage("");
    void api<Activity[]>(`/activity?${queryString}`, {
      signal: abort.signal,
    })
      .then((data) => {
        if (!abort.signal.aborted) {
          setRows(data);
          setPages([data]);
          setPageIndex(0);
          setMore(data.length === filters.limit);
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
  }, [queryString, filters.limit, settings, revision, refreshRevision]);
  async function next() {
    if (busy || !rows.length) return;
    if (pageIndex + 1 < pages.length) {
      setPageIndex(pageIndex + 1);
      setRows(pages[pageIndex + 1]);
      return;
    }
    const isCurrent = captureScope();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await api<Activity[]>(`/activity?${queryString}&before=${rows.at(-1)!.id}`);
      if (alive.current && isCurrent()) {
        if (data.length) {
          setPages((current) => [...current, data]);
          setPageIndex((current) => current + 1);
          setRows(data);
        }
        setMore(data.length === filters.limit);
        setMessage(
          data.length ? "Actividad anterior cargada." : "Llegaste al inicio del historial.",
        );
      }
    } catch (e) {
      if (alive.current && isCurrent())
        setError(e instanceof Error ? e.message : "No se pudo cargar la actividad.");
    } finally {
      if (alive.current && isCurrent()) setBusy(false);
    }
  }
  async function download(format: ExportFormat) {
    if (exporting || loading || busy) return;
    const isCurrent = captureScope();
    setExporting(true);
    setError("");
    setMessage("");
    try {
      await exportTable(format, {
        title: "Auditoría",
        filename: `auditoria-proyecto-${projectId}-pagina-${pageIndex + 1}`,
        headers: [
          "Fecha UTC",
          "Autor",
          "Recurso",
          "Operación",
          ...(settings?.detail === "Resumen" ? [] : ["Antes", "Después"]),
        ],
        rows: visible.map((row) => [
          row.createdAt,
          row.actorName,
          row.resourceId,
          row.action,
          ...(settings?.detail === "Resumen"
            ? []
            : [JSON.stringify(row.before), JSON.stringify(row.after)]),
        ]),
      });
      if (isCurrent()) setMessage("Página de auditoría exportada.");
    } catch (cause) {
      if (isCurrent())
        setError(cause instanceof Error ? cause.message : "No se pudo exportar la auditoría.");
    } finally {
      if (alive.current) setExporting(false);
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
      {!settings && !loading && (
        <button
          className="workspace__secondary"
          onClick={() => {
            setLoading(true);
            setError("");
            setSettingsRevision((v) => v + 1);
          }}
        >
          Reintentar configuración de auditoría
        </button>
      )}
      {settings && (
        <AuditSettingsPanel
          key={projectId}
          projectId={projectId}
          value={settings}
          onSaved={(saved) => {
            setSettings(saved);
            setFilters({ profile: saved.profile, limit: saved.pageSize });
            setRevision((v) => v + 1);
          }}
        />
      )}
      <form
        key={`${projectId}:${settings?.version ?? 0}`}
        className="audit-filters layout__inset"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const input = Object.fromEntries([...form.entries()].filter(([, value]) => value !== ""));
          const parsed = auditFiltersSchema.safeParse({
            ...input,
            limit: settings?.pageSize ?? 50,
          });
          if (!parsed.success) {
            setError(
              "Revisa las fechas y el identificador del autor. Desde debe ser anterior o igual a Hasta.",
            );
            return;
          }
          setFilters(parsed.data);
          setRevision((v) => v + 1);
        }}
      >
        <h3 className="typography__heading">Filtrar historial</h3>
        <div className="audit-filters__fields">
          <label className="workspace__field">
            Perfil de auditoría
            <select name="profile" defaultValue={settings?.profile ?? "General"}>
              {auditProfiles.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="workspace__field">
            Tipo de recurso
            <select name="kind">
              <option value="">Todos</option>
              {auditKinds.map((v) => (
                <option key={v} value={v}>
                  {
                    {
                      bug: "Bug",
                      case: "Caso de prueba",
                      run: "Test Run",
                      evidence: "Evidencia",
                      plan: "Test Plan",
                      requirement: "Requisito",
                      tag: "Tag",
                      workflow: "Flujo",
                      access: "Acceso",
                      "audit-config": "Configuración",
                      user: "Usuario",
                    }[v]
                  }
                </option>
              ))}
            </select>
          </label>
          <label className="workspace__field">
            Operación
            <select name="operation">
              <option value="">Todas</option>
              <option value="insert">Creación</option>
              <option value="update">Actualización</option>
              <option value="delete">Eliminación</option>
              <option value="provision">Alta de usuario</option>
            </select>
          </label>
          <label className="workspace__field">
            ID del autor
            <input name="actorId" inputMode="numeric" pattern="[1-9][0-9]*" />
          </label>
          <label className="workspace__field">
            Desde (UTC)
            <input type="date" name="from" />
          </label>
          <label className="workspace__field">
            Hasta (UTC)
            <input type="date" name="to" />
          </label>
          <label className="workspace__field">
            Buscar en todo el historial
            <input
              name="search"
              type="search"
              maxLength={120}
              placeholder="Autor, identificador o acción"
            />
          </label>
        </div>
        <div className="layout__actions">
          <button className="button button-primary" disabled={loading || busy || !settings}>
            Aplicar filtros
          </button>
          <button
            type="reset"
            className="workspace__secondary"
            disabled={loading || busy || !settings}
            onClick={() => {
              setFilters({
                profile: settings?.profile ?? "General",
                limit: settings?.pageSize ?? 50,
              });
              setSearch("");
            }}
          >
            Restablecer filtros
          </button>
        </div>
      </form>
      <div className="project-activity__summary">
        <div>
          <span>Eventos cargados</span>
          <strong>{pages.reduce((total, page) => total + page.length, 0)}</strong>
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
            limita a la página actual.
          </p>
          <div className="audit-table__exports layout__actions">
            {(["xlsx", "pdf", "md"] as const).map((format) => (
              <button
                className="workspace__secondary"
                disabled={exporting || !visible.length || busy}
                key={format}
                onClick={() => void download(format)}
              >
                {exporting
                  ? "Exportando…"
                  : `Exportar página ${format === "xlsx" ? "Excel" : format === "md" ? "Markdown" : "PDF"}`}
              </button>
            ))}
          </div>
          <AuditTable rows={visible} detailed={settings?.detail !== "Resumen"} />
        </>
      )}
      <nav className="audit-table__pagination layout__actions" aria-label="Paginación de auditoría">
        <button
          className="workspace__secondary"
          disabled={busy || loading || pageIndex === 0}
          onClick={() => {
            setPageIndex((current) => current - 1);
            setRows(pages[pageIndex - 1]);
          }}
        >
          Anterior
        </button>
        <span>Página {pageIndex + 1}</span>
        <button
          className="workspace__secondary"
          disabled={busy || loading || (!more && pageIndex === pages.length - 1) || !rows.length}
          onClick={() => void next()}
        >
          {busy ? "Cargando…" : "Siguiente"}
        </button>
      </nav>
    </section>
  );
}
