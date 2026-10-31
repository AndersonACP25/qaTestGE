import { usePermissions } from "../controllers/ProjectPermissions";
import { useEffect, useRef, useState } from "react";
import Alert from "../Alert";
import { api } from "../api";
import { useBugWorkflow } from "../controllers/useBugWorkflow";
import type { BugWorkflow } from "../../backend/src/models/quality.model";
export default function BugWorkflowView({
  refreshRevision = 0,
  projectId,
  onChanged,
}: {
  refreshRevision?: number;
  projectId: string;
  onChanged: () => void;
}) {
  const readOnly = !usePermissions().can("settings.manage");
  const [revision, setRevision] = useState(0);
  const { workflow, error: loadError } = useBugWorkflow(projectId, revision + refreshRevision);
  const [draft, setDraft] = useState<BugWorkflow | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const current = draft ?? workflow;
  async function save() {
    if (!current) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<BugWorkflow>(`/bug-workflow?projectId=${projectId}`, {
        method: "PUT",
        body: JSON.stringify(current),
      });
      if (!alive.current) return;
      setMessage("Flujo de bugs guardado.");
      setDraft(result);
      setRevision((v) => v + 1);
      onChanged();
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : "No se pudo guardar el flujo.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="quality">
      <h2 className="typography__section">Flujo de bugs del proyecto</h2>
      <p>
        El primer estado se asigna a los bugs nuevos. Marca las transiciones permitidas. Los estados
        en uso no se pueden retirar.
      </p>
      {(error || loadError) && <Alert tone="error">{error || loadError}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      {current && (
        <>
          <label className="workspace__field">
            Nuevo estado
            <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </label>
          <button
            className="workspace__secondary"
            disabled={
              readOnly ||
              busy ||
              !name.trim() ||
              current.states.includes(name.trim()) ||
              current.states.length >= 20
            }
            onClick={() => {
              const state = name.trim();
              setDraft({
                ...current,
                states: [...current.states, state],
                transitions: { ...current.transitions, [state]: [] },
              });
              setName("");
            }}
          >
            Añadir estado
          </button>
          {current.states.map((state, index) => (
            <article className="quality__panel" key={state}>
              <h3 className="typography__heading">
                {state}
                {index === 0 ? " (inicial)" : ""}
              </h3>
              <label className="quality__choice">
                <input
                  type="checkbox"
                  checked={current.closedStates?.includes(state) ?? state === "Resuelto"}
                  disabled={readOnly || busy}
                  onChange={(e) =>
                    setDraft({
                      ...current,
                      closedStates: e.target.checked
                        ? [
                            ...(current.closedStates ??
                              current.states.filter((s) => s === "Resuelto")),
                            state,
                          ]
                        : (
                            current.closedStates ?? current.states.filter((s) => s === "Resuelto")
                          ).filter((s) => s !== state),
                    })
                  }
                />
                Cuenta como resuelto en métricas
              </label>
              <div className="quality__actions">
                <button
                  className="workspace__secondary"
                  disabled={readOnly || busy || index === 0}
                  onClick={() =>
                    setDraft({
                      ...current,
                      states: [state, ...current.states.filter((s) => s !== state)],
                    })
                  }
                >
                  Usar como inicial
                </button>
                <button
                  className="workspace__danger"
                  disabled={readOnly || busy || current.states.length === 1}
                  onClick={() => {
                    const transitions = { ...current.transitions };
                    delete transitions[state];
                    for (const key of Object.keys(transitions))
                      transitions[key] = transitions[key].filter((s) => s !== state);
                    setDraft({
                      ...current,
                      states: current.states.filter((s) => s !== state),
                      closedStates: current.closedStates?.filter((s) => s !== state),
                      transitions,
                    });
                  }}
                >
                  Retirar estado
                </button>
              </div>
              <fieldset disabled={readOnly || busy}>
                <legend>Puede pasar a</legend>
                {current.states
                  .filter((s) => s !== state)
                  .map((target) => (
                    <label className="quality__choice" key={target}>
                      <input
                        type="checkbox"
                        checked={current.transitions[state]?.includes(target) ?? false}
                        onChange={(e) =>
                          setDraft({
                            ...current,
                            transitions: {
                              ...current.transitions,
                              [state]: e.target.checked
                                ? [...current.transitions[state], target]
                                : current.transitions[state].filter((s) => s !== target),
                            },
                          })
                        }
                      />
                      {target}
                    </label>
                  ))}
              </fieldset>
            </article>
          ))}
          <button
            className="button button-primary"
            disabled={readOnly || busy}
            onClick={() => void save()}
          >
            {busy ? "Guardando…" : "Guardar flujo"}
          </button>
        </>
      )}
    </section>
  );
}
