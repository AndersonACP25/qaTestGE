import FileDropzone from "../components/FileDropzone";
import { useEffect, useRef, useState } from "react";
import Dialog from "../Dialog";
import Alert from "../Alert";
import { api, createBug, createTestCase } from "../api";
import { readResourceFile, type ImportKind, type ResourcePreview } from "../models/resourceImport";
import { formatCount } from "../utils/pluralization";
export default function ImportPanel({
  projectId,
  kind,
  onChanged,
}: {
  projectId: string;
  kind: ImportKind;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="workspace__secondary import-panel__trigger"
        onClick={() => setOpen(true)}
      >
        Importar
      </button>
      {open && (
        <ImportDialog
          projectId={projectId}
          kind={kind}
          onChanged={onChanged}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
function ImportDialog({
  projectId,
  kind,
  onChanged,
  onClose,
}: {
  projectId: string;
  kind: ImportKind;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ResourcePreview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(0);
  const [started, setStarted] = useState(false);
  const keys = useRef<string[]>([]);
  const completed = useRef(new Set<string>());
  const alive = useRef(true);
  const [result, setResult] = useState("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function read(file: File) {
    if (busy || started) return;
    setSelectedFile(file);
    setBusy(true);
    setError("");
    setPreview(null);
    setSaved(0);
    setResult("");
    completed.current.clear();
    try {
      const p = await readResourceFile(kind, file);
      if (!alive.current) return;
      keys.current = Array.from({ length: Math.max(1, p.items.length) }, () => crypto.randomUUID());
      setPreview(p);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function save() {
    if (!preview || preview.errors.length || busy) return;
    setStarted(true);
    setBusy(true);
    setError("");
    try {
      if (preview.kind === "tags") {
        const r = await api<{ created: number; existing: number }>(
          `/imports/tags?projectId=${encodeURIComponent(projectId)}`,
          {
            method: "POST",
            headers: { "Idempotency-Key": keys.current[0] },
            body: JSON.stringify({
              rows: preview.items.map((v) => ({ name: v.nombre, color: v.color })),
            }),
          },
        );
        if (!alive.current) return;
        setSaved(preview.items.length);
        setResult(
          `${formatCount(r.created, "tag creado", "tags creados")} · ${formatCount(r.existing, "tag existente", "tags existentes")}`,
        );
        onChanged();
      } else
        for (const i of preview.items.keys()) {
          if (!alive.current) return;
          const key = keys.current[i];
          if (completed.current.has(key)) continue;
          if (preview.kind === "cases") {
            await createTestCase({ projectId, ...preview.items[i] }, key);
          } else {
            const b = preview.items[i];
            await createBug(
              {
                projectId,
                title: b.titulo,
                description: b.descripcion,
                priority: b.prioridad,
                severity: b.severidad,
                environment: b.entorno,
                affectedVersion: b.version,
              },
              key,
            );
          }
          completed.current.add(key);
          if (!alive.current) return;
          setSaved((v) => v + 1);
          onChanged();
        }
      if (alive.current && preview.kind !== "tags")
        setResult("Importación completada. Todos los registros del archivo se guardaron.");
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : "No se pudo importar. Puedes continuar con los pendientes.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Dialog
      wide
      title={`Importar ${kind === "cases" ? "casos de prueba" : kind}`}
      onClose={onClose}
    >
      <div
        className="analytics__form"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (busy || started) return;
          if (event.dataTransfer.files.length !== 1) {
            setError("Arrastra un solo archivo.");
            return;
          }
          void read(event.dataTransfer.files[0]);
        }}
      >
        <p>
          Selecciona la hoja correspondiente en un archivo Excel. Revisa la vista previa antes de
          confirmar. Se crean registros nuevos; no se actualizan los existentes.
        </p>
        <div className="quality__actions">
          <a className="workspace__secondary" href="/templates/plantilla-qaTestGE.xlsx" download>
            Descargar plantilla Excel
          </a>
          <a className="workspace__secondary" href="/templates/guia-importacion.md" download>
            Descargar guía de importación
          </a>
        </div>
        <p className="typography__caption">
          Máximo 2 MiB, 1000 filas y 30 columnas. Solo texto, sin fórmulas. También puedes usar CSV.
          Elimina los ejemplos antes de llenar la plantilla.
        </p>
        <FileDropzone
          label="Archivo Excel o CSV"
          accept=".xlsx,.csv"
          file={selectedFile}
          disabled={busy || started}
          onFile={(file) => void read(file)}
        />
        {error && <Alert tone="error">{error}</Alert>}
        {preview && (
          <>
            <p>
              {formatCount(preview.items.length, "registro preparado", "registros preparados")} ·{" "}
              {formatCount(saved, "registro guardado", "registros guardados")}
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
                <div className="analytics__import-preview">
                  <ul>
                    {preview.items.slice(0, 100).map((item, i) => (
                      <li key={i}>
                        {"title" in item
                          ? item.title
                          : "titulo" in item
                            ? `${item.titulo} · ${item.prioridad} · ${item.severidad}`
                            : `${item.nombre} · ${item.color}`}
                      </li>
                    ))}
                  </ul>
                  {preview.items.length > 100 && (
                    <p>Vista previa limitada a los primeros 100 registros.</p>
                  )}
                </div>
                <button
                  className="button button-primary"
                  disabled={busy || saved === preview.items.length}
                  onClick={() => void save()}
                >
                  {busy ? "Importando…" : "Confirmar importación de pendientes"}
                </button>
              </>
            )}
          </>
        )}
        {started && (
          <p className="typography__caption">
            Conserva este diálogo para continuar los pendientes tras un fallo. Al cerrarlo, consulta
            el listado antes de volver a importar el mismo archivo.
          </p>
        )}
        {result && <Alert tone="success">{result}</Alert>}
      </div>
    </Dialog>
  );
}
