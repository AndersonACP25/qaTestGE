import { useEffect, useState } from "react";
import Alert from "../Alert";
import { api, toCase } from "../api";
import type { ApiCase } from "../contracts/apiContracts";
import type { TestCase } from "../types";
import { usePermissions } from "../controllers/ProjectPermissions";
import { useOperationScope } from "../controllers/useOperationScope";
import type { CaseVersion } from "../../backend/src/models/quality.model";
import { caseSnapshotSchema as snapshot } from "../../backend/src/models/case-version.model";
export default function CaseHistoryPanel({
  caseId,
  projectId,
  expectedVersion,
  onRestored,
}: {
  caseId: string;
  projectId: string;
  expectedVersion: number;
  onRestored: (item: TestCase) => void;
}) {
  const [rows, setRows] = useState<CaseVersion[]>([]);
  const { can } = usePermissions();
  const capture = useOperationScope(projectId, caseId);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api<CaseVersion[]>(`/test-cases/${caseId}/history?projectId=${projectId}`)
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "No se pudo cargar el historial.");
      });
    return () => {
      active = false;
    };
  }, [caseId, projectId, expectedVersion]);
  const versions = rows.map((row) => ({ ...row, fields: snapshot.safeParse(row.snapshot) }));
  const previous = versions.find((row) => String(row.version) === left) ?? versions[1];
  const next = versions.find((row) => String(row.version) === right) ?? versions[0];
  const before = previous?.fields.success ? previous.fields.data : null;
  const after = next?.fields.success ? next.fields.data : null;
  const changes =
    before && after
      ? [
          { field: "Título", before: before.title, after: after.title },
          { field: "Suite", before: before.suite ?? "", after: after.suite ?? "" },
          { field: "Tipo", before: before.test_type, after: after.test_type },
          { field: "Estado documental", before: before.lifecycle, after: after.lifecycle },
          { field: "Precondiciones", before: before.preconditions, after: after.preconditions },
          ...Array.from(
            { length: Math.max(before.steps.length, after.steps.length) },
            (_, index) => {
              const oldStep = before.steps[index];
              const newStep = after.steps[index];
              return [
                {
                  field: `Paso ${index + 1} · Acción`,
                  before: oldStep?.action ?? "",
                  after: newStep?.action ?? "",
                },
                {
                  field: `Paso ${index + 1} · Resultado esperado`,
                  before: oldStep?.expectedResult ?? "",
                  after: newStep?.expectedResult ?? "",
                },
              ];
            },
          ).flat(),
        ].filter((row) => row.before !== row.after)
      : [];
  async function restore(version: number) {
    if (
      busy ||
      !window.confirm(`¿Restaurar el contenido de la versión ${version} como una versión nueva?`)
    )
      return;
    const isCurrent = capture();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const restored = await api<ApiCase>(`/test-cases/${caseId}/history/restore`, {
        method: "POST",
        body: JSON.stringify({ projectId, version, expectedVersion }),
      });
      if (!isCurrent()) return;
      onRestored(toCase(restored));
      setRight("");
      setMessage(`Se creó la versión ${restored.version} a partir de la versión ${version}.`);
    } catch (cause) {
      if (isCurrent())
        setError(cause instanceof Error ? cause.message : "No se pudo restaurar la versión.");
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }
  return (
    <section className="quality__panel">
      <h4>Historial de versiones</h4>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      {versions.length > 1 && (
        <details>
          <summary>Comparar versiones</summary>
          <div className="layout__actions">
            <label className="workspace__field">
              Versión de origen
              <select value={previous?.version} onChange={(event) => setLeft(event.target.value)}>
                {versions.map((row) => (
                  <option key={row.version} value={row.version}>
                    Versión {row.version}
                  </option>
                ))}
              </select>
            </label>
            <label className="workspace__field">
              Versión de comparación
              <select value={next?.version} onChange={(event) => setRight(event.target.value)}>
                {versions.map((row) => (
                  <option key={row.version} value={row.version}>
                    Versión {row.version}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {before && after ? (
            changes.length ? (
              <dl>
                {changes.map((row) => (
                  <div key={row.field}>
                    <dt>
                      <strong>{row.field}</strong>
                    </dt>
                    <dd>
                      Versión {previous?.version}: {row.before || "—"}
                    </dd>
                    <dd>
                      Versión {next?.version}: {row.after || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>Las versiones seleccionadas tienen el mismo contenido.</p>
            )
          ) : (
            <p>No se pudieron comparar las versiones seleccionadas.</p>
          )}
        </details>
      )}
      {versions.map((row) => {
        const data = row.fields;
        return (
          <details key={row.version}>
            <summary>
              Versión {row.version} · {new Date(row.changedAt).toLocaleString("es")}
            </summary>
            {data.success ? (
              <>
                <h4>{data.data.title}</h4>
                <p>
                  {data.data.test_type} · {data.data.lifecycle}
                </p>
                <p>Suite: {data.data.suite || "Sin suite"}</p>
                <p>{data.data.preconditions}</p>
                <ol>
                  {data.data.steps.map((s, i) => (
                    <li key={i}>
                      {s.action}
                      <p>Esperado: {s.expectedResult}</p>
                    </li>
                  ))}
                </ol>
                {can("cases.write") && row.version < expectedVersion && (
                  <button
                    type="button"
                    className="workspace__secondary"
                    disabled={busy}
                    onClick={() => void restore(row.version)}
                  >
                    {busy ? "Restaurando…" : `Restaurar versión ${row.version}`}
                  </button>
                )}
              </>
            ) : (
              <p>No se pudo mostrar esta versión.</p>
            )}
          </details>
        );
      })}
    </section>
  );
}
