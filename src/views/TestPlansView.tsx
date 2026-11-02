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
        <form
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
        <div className="test-plan__catalog layout__stack">
          <label className="workspace__field">
            Buscar Test Plans
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, identificador o descripción"
            />
          </label>
          <h2 className="typography__section">Test Plans del proyecto</h2>
          {!plans.length && <p>No hay Test Plans. Crea el primero para organizar tus casos.</p>}
          {plans.length > 0 &&
            !plans.some((plan) =>
              `${plan.name} ${plan.id} ${plan.description}`
                .toLocaleLowerCase("es")
                .includes(search.trim().toLocaleLowerCase("es")),
            ) && <p>No hay Test Plans que coincidan.</p>}
          <div className="test-plan__cards">
            {plans
              .filter((plan) =>
                `${plan.name} ${plan.id} ${plan.description}`
                  .toLocaleLowerCase("es")
                  .includes(search.trim().toLocaleLowerCase("es")),
              )
              .map((plan) => (
                <article className="quality__panel test-plan__card" key={plan.id}>
                  <header className="test-plan__card-header">
                    <span className="test-plan__icon" aria-hidden="true">
                      ▤
                    </span>
                    <div className="test-plan__card-meta">
                      <span>TEST PLAN</span>
                      <strong>{plan.id}</strong>
                      <span>Revisión {plan.revision}</span>
                    </div>
                    <h3 className="typography__heading">{plan.name}</h3>
                  </header>
                  <FormattedText text={plan.description || "Sin descripción."} />
                  <div className="test-plan__coverage">
                    <span>
                      {formatCount(plan.caseIds.length, "caso incluido", "casos incluidos")}
                    </span>
                    <span>
                      {formatCount(
                        plan.caseIds.filter(
                          (id) => cases.find((item) => item.id === id)?.lifecycle === "Listo",
                        ).length,
                        "caso listo",
                        "casos listos",
                      )}
                    </span>
                    <progress
                      aria-label={`Preparación de ${plan.name}`}
                      value={
                        plan.caseIds.filter(
                          (id) => cases.find((item) => item.id === id)?.lifecycle === "Listo",
                        ).length
                      }
                      max={Math.max(1, plan.caseIds.length)}
                    />
                  </div>
                  <details>
                    <summary>Ver casos del Test Plan</summary>
                    <ul>
                      {plan.caseIds.map((id) => (
                        <li key={id}>
                          <strong>{id}</strong>
                          <span>
                            {cases.find((item) => item.id === id)?.title ?? "Caso no disponible"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <div className="quality__actions">
                    <button
                      className="workspace__secondary"
                      disabled={busy || readOnly}
                      onClick={() => {
                        setEditing(plan);
                        setSelectedCaseIds(plan.caseIds);
                        setCaseSearch("");
                      }}
                    >
                      Editar Test Plan
                    </button>
                    <button
                      className="button button-primary"
                      disabled={busy || readOnly}
                      onClick={() =>
                        void act(async () => {
                          let pending = cycles.current.get(plan.id);
                          if (!pending) {
                            pending = {
                              key: crypto.randomUUID(),
                              body: JSON.stringify({
                                projectId,
                                title: `${plan.name} · Test Run`.slice(0, 200),
                                owner: "QA",
                                planId: plan.id,
                              }),
                            };
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
                        })
                      }
                    >
                      Iniciar Test Run
                    </button>
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
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
