import { Icon } from "../components/RecordPrimitives";
import RunReleaseFields from "../components/RunReleaseFields";
import FormattedText from "../components/FormattedText";
import RichTextarea from "../components/RichTextarea";
import { usePermissions } from "../controllers/ProjectPermissions";
import { useEffect, useRef, useState } from "react";
import { api, toRun } from "../api";
import type { ApiRun } from "../contracts/apiContracts";
import Alert from "../Alert";
import type { TestCase } from "../types";
import type { TestPlan } from "../../backend/src/models/quality.model";
import { formatCount } from "../utils/pluralization";
export default function TestPlansView({
  projectId,
  cases,
  onChanged,
}: {
  projectId: string;
  cases: TestCase[];
  onChanged: () => void;
}) {
  const readOnly = !usePermissions().can("plans.write");
  const [search, setSearch] = useState("");
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [caseSearch, setCaseSearch] = useState("");
  const [formRevision, setFormRevision] = useState(0);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [editing, setEditing] = useState<TestPlan | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const editor = useRef<HTMLFormElement>(null);
  const planKey = useRef(crypto.randomUUID());
  const cycles = useRef(new Map<string, { key: string; body: string }>());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    api<TestPlan[]>(`/test-plans?projectId=${projectId}`)
      .then((data) => {
        if (active) setPlans(data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "No se pudieron cargar los planes.");
      });
    return () => {
      active = false;
    };
  }, [projectId, revision]);
  function focusEditor() {
    editor.current?.scrollIntoView({ block: "start" });
    editor.current
      ?.querySelector<HTMLInputElement>('input[name="name"]')
      ?.focus({ preventScroll: true });
  }
  useEffect(() => {
    if (editing) focusEditor();
  }, [editing]);
  const searchTerm = search.trim().toLocaleLowerCase("es");
  const visiblePlans = plans.filter(({ id, name, description }) =>
    `${name} ${id} ${description}`.toLocaleLowerCase("es").includes(searchTerm),
  );
  const casesById = new Map(cases.map((item) => [item.id, item]));
  async function act(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      if (alive.current) {
        setRevision((v) => v + 1);
        onChanged();
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "No se pudo completar la operación.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="quality test-plan">
      <header className="test-plan__heading">
        <span className="test-plan__eyebrow">PLANIFICACIÓN DE PRUEBAS</span>
        <h2 className="typography__section">Gestión de Test Plan</h2>
        <p>
          Define el alcance, organiza los casos y mantén cada Test Plan. Inicia Test Runs para
          registrar su ejecución.
        </p>
      </header>
      <div className="test-plan__summary">
        <div>
          <span>Test Plans</span>
          <strong>{plans.length}</strong>
        </div>
        <div>
          <span>Casos incluidos</span>
          <strong>{new Set(plans.flatMap((plan) => plan.caseIds)).size}</strong>
        </div>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <div className="test-plan__workspace">
        <section
          className="test-plan__catalog layout__stack"
          aria-labelledby="test-plan-catalog-title"
        >
          <div className="test-plan__catalog-header">
            <div>
              <h2 className="typography__section" id="test-plan-catalog-title">
                Test Plans del proyecto
              </h2>
              <p>{formatCount(visiblePlans.length, "plan visible", "planes visibles")}</p>
            </div>
            {!readOnly && (
              <button type="button" className="button button-secondary" onClick={focusEditor}>
                Ir al editor
              </button>
            )}
          </div>
          <label className="workspace__field">
            Buscar Test Plans
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, identificador o descripción"
            />
          </label>
          {!plans.length && <p>No hay Test Plans. Crea el primero para organizar tus casos.</p>}
          {plans.length > 0 && !visiblePlans.length && <p>No hay Test Plans que coincidan.</p>}
          <div className="test-plan__list">
            {visiblePlans.map((plan) => {
              const ready = plan.caseIds.filter(
                (id) => casesById.get(id)?.lifecycle === "Listo",
              ).length;
              return (
                <article className="test-plan__card layout__panel" key={plan.id}>
                  <div className="test-plan__row">
                    <header className="test-plan__identity">
                      <span className="test-plan__icon" aria-hidden="true">
                        <Icon name="calendar" size={22} />
                      </span>
                      <div className="test-plan__identity-text">
                        <div className="test-plan__card-meta">
                          <strong>{plan.id}</strong>
                          <span>Revisión {plan.revision}</span>
                        </div>
                        <h3 className="typography__heading">{plan.name}</h3>
                      </div>
                    </header>
                    <div className="test-plan__coverage">
                      <div className="test-plan__coverage-label">
                        <span>
                          {formatCount(plan.caseIds.length, "caso incluido", "casos incluidos")}
                        </span>
                        <strong>{formatCount(ready, "caso listo", "casos listos")}</strong>
                      </div>
                      <progress
                        aria-label={`Preparación de ${plan.name}`}
                        value={ready}
                        max={Math.max(1, plan.caseIds.length)}
                      />
                    </div>
                  </div>
                  <FormattedText text={plan.description || "Sin descripción."} />
                  <details className="test-plan__details">
                    <summary>Ver casos del Test Plan</summary>
                    {plan.caseIds.length ? (
                      <ul>
                        {plan.caseIds.map((id) => (
                          <li key={id}>
                            <strong>{id}</strong>
                            <span>{casesById.get(id)?.title ?? "Caso no disponible"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Este plan todavía no incluye casos.</p>
                    )}
                  </details>
                  <div className="quality__actions">
                    <button
                      className="workspace__secondary"
                      disabled={busy || readOnly}
                      onClick={() => {
                        if (editing?.id === plan.id) focusEditor();
                        setEditing(plan);
                        setSelectedCaseIds(plan.caseIds);
                        setCaseSearch("");
                      }}
                    >
                      Editar Test Plan
                    </button>
                    <form
                      className="layout__stack"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        const releaseVersion = String(form.get("releaseVersion") ?? "").trim();
                        const environment = String(form.get("environment") ?? "").trim();
                        void act(async () => {
                          const body = JSON.stringify({
                            projectId,
                            title: `${plan.name} · Test Run`.slice(0, 200),
                            owner: "QA",
                            planId: plan.id,
                            ...(releaseVersion ? { releaseVersion } : {}),
                            ...(environment ? { environment } : {}),
                          });
                          let pending = cycles.current.get(plan.id);
                          if (pending && pending.body !== body)
                            throw new Error(
                              "Restaura los datos del primer envío para reintentar la creación.",
                            );
                          if (!pending) {
                            pending = { key: crypto.randomUUID(), body };
                            cycles.current.set(plan.id, pending);
                          }
                          const run = toRun(
                            await api<ApiRun>("/test-runs", {
                              method: "POST",
                              headers: { "Idempotency-Key": pending.key },
                              body: pending.body,
                            }),
                          );
                          cycles.current.delete(plan.id);
                          if (alive.current)
                            setMessage(`Ejecución ${run.id} creada. Ábrela en Test runs.`);
                        });
                      }}
                    >
                      <fieldset disabled={busy || readOnly} className="layout__stack">
                        <button
                          type="submit"
                          className="button button-primary"
                          disabled={busy || readOnly}
                        >
                          Iniciar Test Run
                        </button>
                        <details>
                          <summary>Versión y entorno (opcional)</summary>
                          <RunReleaseFields />
                        </details>
                      </fieldset>
                    </form>
                    <button
                      className="workspace__danger"
                      disabled={busy || readOnly}
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el Test Plan ${plan.name}?`))
                          void act(async () => {
                            await api<void>(`/test-plans/${plan.id}?projectId=${projectId}`, {
                              method: "DELETE",
                              body: "{}",
                            });
                            if (alive.current) setMessage("Test Plan eliminado.");
                          });
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <form
          ref={editor}
          key={`${editing?.id ?? "new"}:${formRevision}`}
          className="quality__panel test-plan__editor"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const input = {
              projectId,
              name: String(f.get("name")),
              description: String(f.get("description")),
              caseIds: f.getAll("caseIds"),
              revision: editing?.revision,
            };
            void act(async () => {
              await api<TestPlan>(editing ? `/test-plans/${editing.id}` : "/test-plans", {
                method: editing ? "PATCH" : "POST",
                headers: editing ? undefined : { "Idempotency-Key": planKey.current },
                body: JSON.stringify(input),
              });
              if (alive.current) {
                planKey.current = crypto.randomUUID();
                setEditing(null);
                setSelectedCaseIds([]);
                setCaseSearch("");
                setFormRevision((value) => value + 1);
                setMessage("Test Plan guardado.");
              }
            });
          }}
        >
          <fieldset className="permissions__group" disabled={readOnly || busy}>
            <h3 className="typography__heading">
              {editing ? "Editar Test Plan" : "Nuevo Test Plan"}
            </h3>
            <label className="workspace__field">
              Nombre
              <input name="name" required maxLength={200} defaultValue={editing?.name} />
            </label>
            <label className="workspace__field">
              Descripción
              <RichTextarea
                name="description"
                maxLength={5000}
                defaultValue={editing?.description ?? ""}
              />
            </label>
            <fieldset disabled={busy || readOnly}>
              <legend>Casos del Test Plan</legend>
              <label className="workspace__field">
                Buscar casos del Test Plan
                <input
                  type="search"
                  value={caseSearch}
                  onChange={(event) => setCaseSearch(event.target.value)}
                />
              </label>
              <div className="test-plan__case-toolbar">
                <span>
                  {formatCount(selectedCaseIds.length, "caso seleccionado", "casos seleccionados")}
                </span>
                <div className="layout__actions">
                  <button
                    type="button"
                    className="workspace__secondary"
                    onClick={() =>
                      setSelectedCaseIds((current) => [
                        ...new Set([
                          ...current,
                          ...cases
                            .filter(
                              (item) =>
                                item.lifecycle !== "Obsoleto" &&
                                `${item.id} ${item.title}`
                                  .toLocaleLowerCase("es")
                                  .includes(caseSearch.trim().toLocaleLowerCase("es")),
                            )
                            .map((item) => item.id),
                        ]),
                      ])
                    }
                  >
                    Seleccionar visibles
                  </button>
                  <button
                    type="button"
                    className="workspace__secondary"
                    onClick={() => setSelectedCaseIds([])}
                  >
                    Quitar selección
                  </button>
                </div>
              </div>
              <div className="test-plan__case-list">
                {cases.map((c) => (
                  <label
                    className={`test-plan__case-choice${selectedCaseIds.includes(c.id) ? " test-plan__case-choice--selected" : ""}`}
                    key={c.id}
                    hidden={
                      !`${c.id} ${c.title}`
                        .toLocaleLowerCase("es")
                        .includes(caseSearch.trim().toLocaleLowerCase("es"))
                    }
                  >
                    <input
                      type="checkbox"
                      name="caseIds"
                      value={c.id}
                      checked={selectedCaseIds.includes(c.id)}
                      onChange={(event) =>
                        setSelectedCaseIds((current) =>
                          event.target.checked
                            ? [...current, c.id]
                            : current.filter((id) => id !== c.id),
                        )
                      }
                      disabled={c.lifecycle === "Obsoleto" && !editing?.caseIds.includes(c.id)}
                    />
                    <span className="test-plan__case-identity">
                      <strong>{c.id}</strong>
                      <span>{c.title}</span>
                    </span>
                    <span className="test-plan__case-state">{c.lifecycle ?? "Borrador"}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="quality__actions">
              <button className="button button-primary" disabled={busy || readOnly}>
                Guardar Test Plan
              </button>
              {editing && (
                <button
                  className="workspace__secondary"
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setSelectedCaseIds([]);
                    setCaseSearch("");
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
