import { useEffect, useState } from "react";
import type { z } from "zod";
import { api } from "../api";
import Alert from "../Alert";
import TableFooter from "../components/TableFooter";
import { formatCount } from "../utils/pluralization";
import type { releaseReadinessSchema } from "../contracts/analyticsContracts";

type Data = z.infer<typeof releaseReadinessSchema>;
const origins = { manual: "Manual", playwright: "Playwright" } as const;
const outcomes = {
  pending: "Pendientes",
  passed: "Aprobados",
  failed: "Fallidos",
  blocked: "Bloqueados",
  skipped: "Omitidos",
} as const;
const pageSize = 25;

export default function ReleaseReadinessPanel({
  projectId,
  range,
  revision,
  onOpenRun,
  onOpenBug,
  openingRun,
  openRunError,
}: {
  projectId: string;
  range: { from: string; to: string };
  revision: string;
  onOpenRun: (id: string) => void;
  onOpenBug: (id: string) => void;
  openingRun: boolean;
  openRunError: string;
}) {
  const [plans, setPlans] = useState<{ id: string; name: string }[]>([]);
  const [planError, setPlanError] = useState("");
  const [context, setContext] = useState({ releaseVersion: "", environment: "" });
  const [filters, setFilters] = useState({ plan: "", origin: "", outcome: "", page: 1 });
  const [state, setState] = useState<{ key: string; data?: Data; error?: string }>({ key: "" });
  useEffect(() => {
    const controller = new AbortController();
    void api<{ id: string; name: string }[]>(
      `/test-plans?projectId=${encodeURIComponent(projectId)}`,
      { signal: controller.signal },
    )
      .then((items) => {
        if (!controller.signal.aborted) {
          setPlans(items);
          setPlanError("");
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setPlanError(
            cause instanceof Error ? cause.message : "No se pudieron consultar los planes.",
          );
      });
    return () => controller.abort();
  }, [projectId, revision]);
  const query = new URLSearchParams({
    projectId,
    ...range,
    offset: String((filters.page - 1) * pageSize),
  });
  if (context.releaseVersion) query.set("releaseVersion", context.releaseVersion);
  if (context.environment) query.set("environment", context.environment);
  if (filters.plan) query.set("plan", filters.plan);
  if (filters.origin) query.set("origin", filters.origin);
  if (filters.outcome) query.set("outcome", filters.outcome);
  const path = `/release-readiness?${query}`;
  const key = `${path}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    void api<Data>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            error: cause instanceof Error ? cause.message : "No se pudo consultar el release.",
          });
      });
    return () => controller.abort();
  }, [path, key]);
  const data = state.key === key ? state.data : undefined;
  const error = state.key === key ? state.error : undefined;
  const filter = (name: "plan" | "origin" | "outcome", value: string) =>
    setFilters((current) => ({ ...current, [name]: value, page: 1 }));
  return (
    <section className="release-readiness layout__stack" aria-label="Preparación de release">
      <header className="release-readiness__header layout__panel layout__stack">
        <span className="reports-view__eyebrow">
          {range.from} — {range.to} · UTC
        </span>
        <h2 className="typography__section">Preparación de release</h2>
        <p>
          Consulta el alcance del plan, compara resultados manuales y de Playwright y revisa los
          bugs críticos abiertos.
        </p>
      </header>
      <section className="release-readiness__section layout__panel layout__stack">
        <h3 className="typography__heading">Alcance y filtros</h3>
        <form
          className="release-readiness__filters"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setContext({
              releaseVersion: String(form.get("releaseVersion") ?? "").trim(),
              environment: String(form.get("environment") ?? "").trim(),
            });
            setFilters((current) => ({ ...current, page: 1 }));
          }}
        >
          <label className="workspace__field">
            Filtrar por versión
            <input name="releaseVersion" maxLength={100} placeholder="Ej.: 2.0.0" />
          </label>
          <label className="workspace__field">
            Filtrar por entorno
            <input name="environment" maxLength={100} placeholder="Ej.: QA" />
          </label>
          <button className="button button-primary" type="submit">
            Aplicar versión y entorno
          </button>
        </form>
        <div className="release-readiness__filters">
          <label className="workspace__field">
            Casos del Test Plan
            <select value={filters.plan} onChange={(event) => filter("plan", event.target.value)}>
              <option value="">Todos los casos</option>
              {plans.map((plan) => (
                <option value={plan.id} key={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>
          <label className="workspace__field">
            Origen de las ejecuciones
            <select
              value={filters.origin}
              onChange={(event) => filter("origin", event.target.value)}
            >
              <option value="">Todos los orígenes</option>
              {Object.entries(origins).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="workspace__field">
            Resultado de la ejecución
            <select
              value={filters.outcome}
              onChange={(event) => filter("outcome", event.target.value)}
            >
              <option value="">Todos los resultados</option>
              {Object.entries(outcomes).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="release-readiness__context layout__actions" aria-live="polite">
          <span>
            Versión: <strong>{context.releaseVersion || "Todas"}</strong>
          </span>
          <span>
            Entorno: <strong>{context.environment || "Todos"}</strong>
          </span>
        </div>
      </section>
      {(error || planError || openRunError) && (
        <Alert tone="error">{error || planError || openRunError}</Alert>
      )}
      {((!data && !error) || openingRun) && (
        <p role="status">
          {openingRun ? "Abriendo registro…" : "Cargando preparación de release…"}
        </p>
      )}
      {data && (
        <>
          <section className="release-readiness__section layout__panel layout__stack">
            <h3 className="typography__heading">Validación de requisitos</h3>
            <p>
              Un requisito se aprueba cuando el último resultado evaluable de cada caso vigente del
              alcance está aprobado.
            </p>
            <dl className="reports-view__metrics release-readiness__metrics">
              {[
                ["Requisitos del alcance", data.coverage.requirements],
                ["Con casos vinculados", data.coverage.linked],
                ["Con todos sus casos evaluados", data.coverage.executed],
                ["Con todos sus casos aprobados", data.coverage.passed],
              ].map(([label, value]) => (
                <div className="reports-view__metric" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="release-readiness__section layout__panel layout__stack">
            <h3 className="typography__heading">Bugs críticos abiertos</h3>
            <p>
              {formatCount(
                data.criticalBugs.total,
                "bug crítico abierto",
                "bugs críticos abiertos",
              )}{" "}
              en los casos o resultados del período.
            </p>
            {data.criticalBugs.rows.length > 0 && (
              <ul className="release-readiness__bugs">
                {data.criticalBugs.rows.map((bug) => (
                  <li key={bug.id}>
                    <button
                      type="button"
                      className="workspace-table__open release-readiness__bug"
                      disabled={openingRun}
                      onClick={() => onOpenBug(bug.id)}
                    >
                      <strong>{bug.id}</strong> · {bug.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {data.criticalBugs.total > data.criticalBugs.rows.length && (
              <p className="typography__caption">Se muestran los 10 más recientes.</p>
            )}
          </section>
          <section className="release-readiness__section layout__panel layout__stack">
            <h3 className="typography__heading">Resultados por origen</h3>
            <p>Selecciona un resultado para filtrar el listado de ejecuciones.</p>
            <div className="release-readiness__origins">
              {(Object.keys(origins) as (keyof typeof origins)[]).map((origin) => (
                <article
                  className="release-readiness__origin layout__panel layout__stack"
                  key={origin}
                >
                  <header className="release-readiness__origin-heading">
                    <h4>{origins[origin]}</h4>
                    <span>{formatCount(data.totals[origin].runs, "ejecución", "ejecuciones")}</span>
                  </header>
                  <div className="release-readiness__outcomes">
                    {(Object.keys(outcomes) as (keyof typeof outcomes)[]).map((outcome) => (
                      <button
                        key={outcome}
                        type="button"
                        className={`release-readiness__outcome release-readiness__outcome--${outcome}`}
                        disabled={!data.totals[origin][outcome]}
                        aria-pressed={filters.origin === origin && filters.outcome === outcome}
                        aria-label={`${origins[origin]} · ${outcomes[outcome]} · ${data.totals[origin][outcome]}`}
                        onClick={() =>
                          setFilters((current) => ({ ...current, origin, outcome, page: 1 }))
                        }
                      >
                        <strong>{data.totals[origin][outcome]}</strong>
                        <span>{outcomes[outcome]}</span>
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="release-readiness__section layout__panel layout__stack">
            <h3 className="typography__heading">Ejecuciones del release</h3>
            {data.rows.length ? (
              <div className="workspace-table__scroll">
                <table className="workspace-table__table">
                  <thead>
                    <tr>
                      <th>Ejecución</th>
                      <th>Origen</th>
                      <th>Versión</th>
                      <th>Entorno</th>
                      {Object.values(outcomes).map((label) => (
                        <th key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((run) => (
                      <tr key={run.id}>
                        <td data-label="Ejecución">
                          <button
                            type="button"
                            className="workspace-table__open"
                            disabled={openingRun}
                            onClick={() => onOpenRun(run.id)}
                          >
                            {run.id} · {run.title}
                          </button>
                        </td>
                        <td data-label="Origen">{origins[run.origin]}</td>
                        <td data-label="Versión">{run.releaseVersion ?? "Sin registrar"}</td>
                        <td data-label="Entorno">{run.environment ?? "Sin registrar"}</td>
                        {(Object.keys(outcomes) as (keyof typeof outcomes)[]).map((outcome) => (
                          <td key={outcome} data-label={outcomes[outcome]}>
                            {run[outcome]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No hay ejecuciones que coincidan con los filtros.</p>
            )}
            <TableFooter
              total={data.total}
              page={filters.page}
              pageSize={pageSize}
              onPage={(page) => setFilters((current) => ({ ...current, page }))}
            />
          </section>
        </>
      )}
    </section>
  );
}
