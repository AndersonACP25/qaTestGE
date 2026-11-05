import { useEffect, useRef, useState } from "react";
import type { RunSummary, RunSummaryContext } from "../../backend/src/models/run-summary.model";
import { api } from "../api";
import Alert from "../Alert";
import Dialog from "../Dialog";
import GeminiConsentDialog from "../components/GeminiConsentDialog";
import { formatCount } from "../utils/pluralization";

const labels = {
  passed: ["aprobado", "aprobados"],
  failed: ["fallido", "fallidos"],
  blocked: ["bloqueado", "bloqueados"],
  skipped: ["omitido", "omitidos"],
  pending: ["pendiente", "pendientes"],
} as const;

function RunCounts({ counts }: Pick<RunSummaryContext, "counts">) {
  return (
    <ul>
      {Object.entries(labels).map(([status, [singular, plural]]) => (
        <li key={status}>{formatCount(counts[status as keyof typeof labels], singular, plural)}</li>
      ))}
    </ul>
  );
}

export default function RunSummaryDialog({
  projectId,
  runId,
  onClose,
}: {
  projectId: string;
  runId: string;
  onClose: () => void;
}) {
  const [context, setContext] = useState<RunSummaryContext>();
  const [summary, setSummary] = useState<string>();
  const [error, setError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef<AbortController | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    const query = new URLSearchParams({ projectId, runId });
    void api<RunSummaryContext>(`/ai/run-summary?${query}`, { signal: abort.signal })
      .then((data) => {
        if (!abort.signal.aborted) setContext(data);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setError(cause instanceof Error ? cause.message : "No se pudo preparar el resumen.");
      });
    return () => {
      abort.abort();
      generation.current?.abort();
    };
  }, [projectId, runId]);

  async function generate() {
    if (!context || generation.current) return;
    const abort = new AbortController();
    generation.current = abort;
    setBusy(true);
    setError("");
    try {
      const result = await api<RunSummary>("/ai/run-summary", {
        method: "POST",
        signal: abort.signal,
        body: JSON.stringify({ projectId, runId, consent: true, context }),
      });
      if (!abort.signal.aborted) setSummary(result.summary);
    } catch (cause) {
      if (!abort.signal.aborted)
        setError(cause instanceof Error ? cause.message : "No se pudo generar el resumen.");
    } finally {
      generation.current = null;
      if (!abort.signal.aborted) setBusy(false);
    }
  }

  async function copy() {
    if (!summary?.trim()) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopyFeedback("Resumen copiado.");
    } catch {
      setCopyFeedback("El navegador bloqueó la copia. Selecciona el texto para copiarlo.");
    }
  }

  if (summary !== undefined) {
    return (
      <Dialog title={`Resumen de ejecución · ${runId}`} onClose={onClose} wide>
        <div className="layout__stack">
          <p>
            Revisa el texto generado antes de compartirlo y contrástalo con los resultados
            registrados.
          </p>
          {context && (
            <section aria-label="Cifras de la ejecución">
              <strong>Cifras de la ejecución</strong>
              <RunCounts counts={context.counts} />
            </section>
          )}
          <label className="workspace__field">
            Resumen editable
            <textarea
              rows={10}
              maxLength={3500}
              value={summary}
              onChange={(event) => {
                setSummary(event.target.value);
                setCopyFeedback("");
              }}
            />
          </label>
          <div className="layout__actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => void copy()}
              disabled={!summary.trim()}
            >
              Copiar resumen
            </button>
          </div>
          {copyFeedback && <p role="status">{copyFeedback}</p>}
        </div>
      </Dialog>
    );
  }
  return (
    <GeminiConsentDialog
      onClose={onClose}
      onConfirm={() => void generate()}
      disabled={!context || busy}
    >
      {error && <Alert tone="error">{error}</Alert>}
      {busy && <p role="status">Generando resumen…</p>}
      {!context && !error && <p role="status">Consultando resultados de la ejecución…</p>}
      {context && (
        <div className="gemini-consent__text">
          <strong>Resultados que se enviarán</strong>
          <RunCounts counts={context.counts} />
          {context.findings.length > 0 && (
            <>
              <strong>Muestra de fallos y bloqueos</strong>
              <ul>
                {context.findings.map(({ caseId, title, status }) => (
                  <li key={caseId}>
                    {caseId} · {status === "failed" ? "Fallido" : "Bloqueado"} · {title}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </GeminiConsentDialog>
  );
}
