import { useEffect, useRef, useState } from "react";
import Alert from "../Alert";
import Dialog from "../Dialog";
import {
  api,
  toRun,
  createBug,
  uploadEvidenceFile,
  downloadEvidenceFile,
  deleteTestRun,
  updateTestRun,
  updateTestRunResult,
} from "../api";
import type { ApiRun } from "../contracts/apiContracts";
import type { Bug, Evidence, TestCase, TestRun } from "../types";
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
  bugs = [],
  evidence = [],
  onCreated,
}: {
  run: TestRun;
  cases: TestCase[];
  onClose: () => void;
  onChanged: (run: TestRun) => void;
  onDeleted: () => void;
  bugs?: Bug[];
  evidence?: Evidence[];
  onCreated?: (run: TestRun) => void;
  initialAction?: "view" | "edit" | "delete" | "execute";
}) {
  const [failureId, setFailureId] = useState("");
  const [bugKey, setBugKey] = useState(crypto.randomUUID());
  const cloneRequests = useRef(new Map<boolean, { key: string; body: string }>());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
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
      if (alive.current)
        setError(cause instanceof Error ? cause.message : "No se pudo completar la operación.");
    } finally {
      if (alive.current) setBusy(false);
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
        <p>
          {run.planId ? `Plan: ${run.planId}` : "Sin plan"}
          {run.sourceRunId ? ` · Origen: ${run.sourceRunId}` : ""}
        </p>
        <div className="quality__actions">
          {[false, true].map((failedOnly) => (
            <button
              type="button"
              key={String(failedOnly)}
              className="workspace__secondary"
              disabled={
                busy ||
                (failedOnly && !run.results?.some((r) => r.executedAt && r.status === "failed"))
              }
              onClick={() =>
                void act(async () => {
                  let pending = cloneRequests.current.get(failedOnly);
                  if (!pending) {
                    pending = {
                      key: crypto.randomUUID(),
                      body: JSON.stringify({
                        projectId: run.projectId,
                        title: `${run.title} · ${failedOnly ? "fallidos" : "copia"}`.slice(0, 200),
                        owner: run.owner,
                        sourceRunId: run.id,
                        failedOnly,
                      }),
                    };
                    cloneRequests.current.set(failedOnly, pending);
                  }
                  const created = toRun(
                    await api<ApiRun>("/test-runs", {
                      method: "POST",
                      headers: { "Idempotency-Key": pending.key },
                      body: pending.body,
                    }),
                  );
                  cloneRequests.current.delete(failedOnly);
                  if (alive.current) {
                    setMessage(`Ejecución ${created.id} creada con resultados pendientes.`);
                    onCreated?.(created);
                  }
                })
              }
            >
              {failedOnly ? "Reejecutar solo fallidos" : "Clonar ejecución"}
            </button>
          ))}
        </div>
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
            <h3 className="typography__heading">Resultados por caso</h3>
            {initialAction === "execute" && run.status !== "Completado" && (
              <Alert tone="info">
                Registra el resultado de cada caso pendiente y guárdalo para actualizar el progreso.
              </Alert>
            )}
            {!run.results?.length && (
              <p>Aún no hay casos. Edita la ejecución para seleccionarlos.</p>
            )}
            {run.results?.map((result) => (
              <div key={`${result.id}:${result.executedAt}`} className="quality__panel">
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
                    {result.caseId} · {result.title} · versión {result.caseVersion ?? 1}
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
                <label className="workspace__field">
                  Adjuntar evidencia a {result.id}
                  <input
                    type="file"
                    disabled={busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        void act(async () => {
                          await uploadEvidenceFile(null, run.projectId!, file, result.id);
                          if (alive.current) {
                            setMessage("Evidencia enlazada al resultado.");
                            onChanged(run);
                          }
                        });
                    }}
                  />
                </label>
                {evidence
                  .filter((e) => e.related.split(", ").includes(result.id))
                  .map((e) => (
                    <p key={e.id}>
                      {e.id} · {e.name}
                      {e.hasFile && (
                        <button
                          type="button"
                          className="workspace__secondary"
                          disabled={busy}
                          onClick={() =>
                            void act(() => downloadEvidenceFile(e.id, run.projectId!, e.name))
                          }
                        >
                          Descargar evidencia
                        </button>
                      )}
                    </p>
                  ))}
                {result.status === "failed" && result.executedAt && (
                  <>
                    {bugs.some((b) => b.sourceResultId === result.id) ? (
                      <p>Bug enlazado: {bugs.find((b) => b.sourceResultId === result.id)?.id}</p>
                    ) : (
                      <button
                        type="button"
                        className="workspace__secondary"
                        disabled={busy}
                        onClick={() => {
                          setFailureId(result.id);
                          setBugKey(crypto.randomUUID());
                        }}
                      >
                        Crear bug desde este fallo
                      </button>
                    )}
                    {failureId === result.id && (
                      <form
                        className="quality__panel"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          void act(async () => {
                            const bug = await createBug(
                              {
                                projectId: run.projectId!,
                                title: String(f.get("title")),
                                description: String(f.get("description")),
                                priority: "Media",
                                severity: String(f.get("severity")) as Bug["priority"],
                                environment: String(f.get("environment")),
                                affectedVersion: String(f.get("affectedVersion")),
                                sourceResultId: result.id,
                              },
                              bugKey,
                            );
                            if (alive.current) {
                              setFailureId("");
                              setMessage(
                                `Bug ${bug.id} creado con caso, ejecución, pasos y evidencia enlazados.`,
                              );
                              onChanged(run);
                            }
                          });
                        }}
                      >
                        <h4>Revisar bug del resultado {result.id}</h4>
                        <p>
                          Se enlazarán {result.caseId}, {run.id}, los pasos evaluados y las
                          evidencias existentes.
                        </p>
                        <label className="workspace__field">
                          Título
                          <input
                            name="title"
                            required
                            maxLength={200}
                            defaultValue={`Fallo: ${result.title}`.slice(0, 200)}
                          />
                        </label>
                        <label className="workspace__field">
                          Descripción / resultado observado
                          <textarea
                            name="description"
                            required
                            maxLength={5000}
                            defaultValue={result.notes}
                          />
                        </label>
                        <label className="workspace__field">
                          Severidad
                          <select name="severity" defaultValue="Media">
                            {["Crítica", "Alta", "Media", "Baja"].map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                          </select>
                        </label>
                        <label className="workspace__field">
                          Entorno
                          <input name="environment" maxLength={100} />
                        </label>
                        <label className="workspace__field">
                          Versión afectada
                          <input name="affectedVersion" maxLength={100} />
                        </label>
                        <div className="quality__actions">
                          <button className="button button-primary" disabled={busy}>
                            Confirmar creación del bug
                          </button>
                          <button
                            type="button"
                            className="workspace__secondary"
                            disabled={busy}
                            onClick={() => setFailureId("")}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
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
