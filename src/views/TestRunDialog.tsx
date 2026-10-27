import { useEffect, useRef, useState } from "react";
import Alert from "../Alert";
import Dialog from "../Dialog";
import { deleteTestRun, updateTestRun, updateTestRunResult } from "../api";
import type { TestCase, TestRun } from "../types";
import type { ResultStatus, TestRunStatus } from "../../backend/src/models/test-run.model";

const labels: Record<ResultStatus, string> = {
  passed: "Aprobado",
  failed: "Fallido",
  blocked: "Bloqueado",
  skipped: "Omitido",
};

export default function TestRunDialog({
  run,
  cases,
  onClose,
  onChanged,
  onDeleted,
  initialAction = "view",
}: {
  run: TestRun;
  cases: TestCase[];
  onClose: () => void;
  onChanged: (run: TestRun) => void;
  onDeleted: () => void;
  initialAction?: "view" | "edit" | "delete" | "execute";
}) {
  const [editing, setEditing] = useState(initialAction === "edit");
  const [confirmDelete, setConfirmDelete] = useState(initialAction === "delete");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const content = useRef<HTMLDivElement>(null);
  const pendingControl = useRef<HTMLSelectElement>(null);
  const pendingResultId = run.results?.find((result) => !result.executedAt)?.id;
  useEffect(() => {
    if (initialAction !== "execute" || run.status === "Completado") return;
    const control = pendingControl.current;
    if (!control) return;
    control.closest(".test-run__result")?.scrollIntoView({ block: "center" });
    control.focus({ preventScroll: true });
  }, [initialAction, run.id, run.status]);
  useEffect(() => {
    if (error || message)
      content.current?.closest<HTMLElement>('[role="dialog"]')?.scrollTo({ top: 0 });
  }, [error, message]);
  async function act(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la operación.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog wide title={`Ejecución ${run.id}`} onClose={onClose}>
      <div className="test-run" ref={content}>
        {error && <Alert tone="error">{error}</Alert>}
        {message && <Alert tone="success">{message}</Alert>}
        <p className="test-run__summary">
          {run.title} · {run.status} · {run.progress}% registrado
        </p>
        <progress
          className="test-run__progress"
          aria-label="Progreso de ejecución"
          value={run.progress}
          max={100}
        />
        {editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void act(async () => {
                const updated = await updateTestRun(run.id, run.projectId!, {
                  title: String(form.get("title")),
                  owner: String(form.get("owner")),
                  caseIds: form.getAll("caseIds") as string[],
                  status: String(form.get("status")) as TestRunStatus,
                  tagIds: run.tagIds ?? [],
                });
                onChanged(updated);
                setEditing(false);
                setMessage("Ejecución actualizada.");
              });
            }}
          >
            <fieldset className="test-run__fields" disabled={busy}>
              <legend>Editar ejecución</legend>
              <label className="workspace__field">
                Título
                <input name="title" defaultValue={run.title} required maxLength={200} />
              </label>
              <label className="workspace__field">
                Responsable
                <input name="owner" defaultValue={run.owner} required maxLength={100} />
              </label>
              <label className="workspace__field">
                Estado
                <select name="status" defaultValue={run.status}>
                  <option>En curso</option>
                  <option>Completado</option>
                </select>
              </label>
              <p>
                Para completar, registra un resultado para cada caso. Los resultados existentes se
                conservan al mantener el caso seleccionado.
              </p>
              <fieldset className="test-run__selection">
                <legend>Casos de la ejecución</legend>
                {cases.map((item) => (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      name="caseIds"
                      value={item.id}
                      defaultChecked={run.caseIds?.includes(item.id)}
                    />
                    {item.id} · {item.title}
                  </label>
                ))}
              </fieldset>
              <div className="test-run__actions">
                <button
                  className="workspace__secondary"
                  type="button"
                  onClick={() => setEditing(false)}
                >
                  Cancelar edición
                </button>
                <button className="button button-primary">Guardar ejecución</button>
              </div>
            </fieldset>
          </form>
        ) : (
          <>
            <div className="test-run__actions">
              <button
                className="workspace__secondary"
                disabled={busy}
                onClick={() => {
                  setEditing(true);
                  setConfirmDelete(false);
                }}
              >
                Editar ejecución
              </button>
              <button
                className="workspace__danger"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                Eliminar ejecución
              </button>
            </div>
            {confirmDelete && (
              <div className="test-run__confirmation">
                <Alert tone="warning">
                  Se eliminará la ejecución y sus resultados. Los casos se conservan. Si hay
                  evidencias vinculadas, se rechazará la eliminación.
                </Alert>
                <div className="test-run__actions">
                  <button
                    className="workspace__secondary"
                    disabled={busy}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancelar eliminación
                  </button>
                  <button
                    className="workspace__danger"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        await deleteTestRun(run.id, run.projectId!);
                        onDeleted();
                      })
                    }
                  >
                    Confirmar eliminación
                  </button>
                </div>
              </div>
            )}
            <h3>Resultados por caso</h3>
            {initialAction === "execute" && run.status !== "Completado" && (
              <Alert tone="info">
                Registra el resultado de cada caso pendiente y guárdalo para actualizar el progreso.
              </Alert>
            )}
            {!run.results?.length && (
              <p>Aún no hay casos. Edita la ejecución para seleccionarlos.</p>
            )}
            {run.results?.map((result) => (
              <form
                className="test-run__result"
                key={`${result.id}:${result.executedAt}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void act(async () => {
                    onChanged(
                      await updateTestRunResult(run.id, result.id, run.projectId!, {
                        status: String(form.get("status")) as ResultStatus,
                        notes: String(form.get("notes")),
                      }),
                    );
                    setMessage(`Resultado de ${result.caseId} guardado.`);
                  });
                }}
              >
                <h4>
                  {result.caseId} · {result.title}
                </h4>
                <p>
                  {result.executedAt
                    ? `Registrado: ${labels[result.status]}`
                    : "Pendiente de ejecutar"}
                </p>
                <details>
                  <summary>Ver pasos de esta ejecución ({result.steps.length})</summary>
                  <ol>
                    {result.steps.map((step, index) => (
                      <li key={index}>
                        {step.action}
                        <p>Esperado: {step.expectedResult}</p>
                      </li>
                    ))}
                  </ol>
                </details>
                <fieldset
                  className="test-run__fields"
                  disabled={busy || run.status === "Completado"}
                >
                  <legend>Registrar resultado de {result.caseId}</legend>
                  <label className="workspace__field">
                    Resultado
                    <select
                      ref={
                        initialAction === "execute" && result.id === pendingResultId
                          ? pendingControl
                          : undefined
                      }
                      name="status"
                      defaultValue={result.status}
                    >
                      {Object.entries(labels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="workspace__field">
                    Notas
                    <textarea name="notes" defaultValue={result.notes} maxLength={10000} />
                  </label>
                  <button className="workspace__secondary">Guardar resultado</button>
                </fieldset>
              </form>
            ))}
            {run.status === "Completado" && (
              <Alert tone="info">
                Reabre la ejecución desde Editar para cambiar sus resultados.
              </Alert>
            )}
          </>
        )}
        {busy && <p role="status">Guardando cambios…</p>}
      </div>
    </Dialog>
  );
}
