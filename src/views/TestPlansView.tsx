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
    <section className="quality">
      <h2 className="typography__section">Planes y ciclos de prueba</h2>
      <p>
        Agrupa casos y crea una ejecución de cada ciclo. Las ejecuciones conservan el vínculo al
        plan aunque este cambie.
      </p>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <form
        key={editing?.id ?? "new"}
        className="quality__panel"
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
              setMessage("Plan guardado.");
            }
          });
        }}
      >
        <h3 className="typography__heading">{editing ? "Editar plan" : "Nuevo plan"}</h3>
        <label className="workspace__field">
          Nombre
          <input name="name" required maxLength={200} defaultValue={editing?.name} />
        </label>
        <label className="workspace__field">
          Descripción
          <textarea name="description" maxLength={5000} defaultValue={editing?.description ?? ""} />
        </label>
        <fieldset disabled={busy}>
          <legend>Casos del plan</legend>
          {cases.map((c) => (
            <label className="quality__choice" key={c.id}>
              <input
                type="checkbox"
                name="caseIds"
                value={c.id}
                defaultChecked={editing?.caseIds.includes(c.id)}
              />
              {c.id} · {c.title} · {c.lifecycle ?? "Borrador"}
            </label>
          ))}
        </fieldset>
        <div className="quality__actions">
          <button className="button button-primary" disabled={busy}>
            Guardar plan
          </button>
          {editing && (
            <button className="workspace__secondary" type="button" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          )}
        </div>
      </form>
      {plans.map((plan) => (
        <article className="quality__panel" key={plan.id}>
          <h3 className="typography__heading">{plan.name}</h3>
          <p>{plan.description}</p>
          <p>
            {plan.id} · {formatCount(plan.caseIds.length, "caso", "casos")} · revisión{" "}
            {plan.revision}
          </p>
          <div className="quality__actions">
            <button
              className="workspace__secondary"
              disabled={busy}
              onClick={() => setEditing(plan)}
            >
              Editar plan
            </button>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  let pending = cycles.current.get(plan.id);
                  if (!pending) {
                    pending = {
                      key: crypto.randomUUID(),
                      body: JSON.stringify({
                        projectId,
                        title: `${plan.name} · ciclo`.slice(0, 200),
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
                  if (alive.current) setMessage(`Ejecución ${run.id} creada. Ábrela en Test runs.`);
                })
              }
            >
              Iniciar ciclo
            </button>
            <button
              className="workspace__danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`¿Eliminar el plan ${plan.name}?`))
                  void act(async () => {
                    await api<void>(`/test-plans/${plan.id}?projectId=${projectId}`, {
                      method: "DELETE",
                      body: "{}",
                    });
                  });
              }}
            >
              Eliminar
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
