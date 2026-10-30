import { useEffect, useRef, useState } from "react";
import Alert from "../Alert";
import { createTestCase } from "../api";
import { importColumns, readCaseFile, type CaseImportPreview } from "../models/caseImport";
import { formatCount } from "../utils/pluralization";
import { download as downloadBlob } from "../utils/download";
export default function CaseImportPanel({
  projectId,
  onChanged,
}: {
  projectId: string;
  onChanged: () => void;
}) {
  const [preview, setPreview] = useState<CaseImportPreview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const keys = useRef<string[]>([]);
  const completed = useRef(new Set<string>());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function read(file: File) {
    setBusy(true);
    setError("");
    setPreview(null);
    setSaved([]);
    completed.current.clear();
    try {
      const result = await readCaseFile(file);
      if (!alive.current) return;
      keys.current = result.cases.map(() => crypto.randomUUID());
      setPreview(result);
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : "No se pudo leer el archivo.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function save() {
    if (!preview || preview.errors.length || busy) return;
    setBusy(true);
    setError("");
    try {
      for (const [i, item] of preview.cases.entries()) {
        if (!alive.current) return;
        const key = keys.current[i];
        if (completed.current.has(key)) continue;
        const result = await createTestCase({ projectId, ...item }, key);
        completed.current.add(key);
        if (!alive.current) return;
        setSaved((v) => [...v, result.id]);
        onChanged();
      }
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo importar. Puedes continuar con los pendientes.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <details className="quality__panel">
      <summary>Importar casos desde CSV o Excel</summary>
      <p>
        Una fila por paso. Repite la clave y los datos del caso para agrupar sus pasos. La
        importación crea casos nuevos.
      </p>
      <button
        type="button"
        className="workspace__secondary"
        onClick={() =>
          downloadBlob(
            new Blob(
              [
                `\uFEFF${importColumns.join(";")}\r\nlogin;Inicio de sesión;Acceso;Funcional;Borrador;Usuario activo;Enviar credenciales;Mostrar Dashboard\r\n`,
              ],
              { type: "text/csv;charset=utf-8" },
            ),
            "plantilla-casos.csv",
          )
        }
      >
        Descargar plantilla CSV
      </button>
      <label className="workspace__field">
        Archivo (CSV o .xlsx, máximo 2 MiB)
        <input
          type="file"
          accept=".csv,.xlsx"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void read(f);
          }}
        />
      </label>
      {error && <Alert tone="error">{error}</Alert>}
      {preview && (
        <>
          <p>
            {formatCount(preview.cases.length, "caso preparado", "casos preparados")} ·{" "}
            {formatCount(saved.length, "caso guardado", "casos guardados")}
          </p>
          {preview.errors.length > 0 ? (
            <Alert tone="error">
              <ul>
                {preview.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </Alert>
          ) : (
            <>
              <ul>
                {preview.cases.map((c, i) => (
                  <li key={i}>
                    {c.title} · {c.testType} · {c.lifecycle} ·{" "}
                    {formatCount(c.steps?.length ?? 0, "paso", "pasos")}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="button button-primary"
                disabled={busy || saved.length === preview.cases.length}
                onClick={() => void save()}
              >
                {busy ? "Importando…" : "Confirmar importación de pendientes"}
              </button>
            </>
          )}
        </>
      )}
    </details>
  );
}
