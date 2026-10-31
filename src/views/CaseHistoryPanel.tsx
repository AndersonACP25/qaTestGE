import { useEffect, useState } from "react";
import { z } from "zod";
import Alert from "../Alert";
import { api } from "../api";
import type { CaseVersion } from "../../backend/src/models/quality.model";
const snapshot = z.object({
  title: z.string(),
  test_type: z.string(),
  lifecycle: z.string(),
  suite: z.string().nullable().optional(),
  preconditions: z.string(),
  steps: z.array(z.object({ action: z.string(), expectedResult: z.string() })),
});
export default function CaseHistoryPanel({
  caseId,
  projectId,
}: {
  caseId: string;
  projectId: string;
}) {
  const [rows, setRows] = useState<CaseVersion[]>([]);
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
  }, [caseId, projectId]);
  return (
    <section className="quality__panel">
      <h4>Historial de versiones</h4>
      {error && <Alert tone="error">{error}</Alert>}
      {rows.map((row) => {
        const data = snapshot.safeParse(row.snapshot);
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
