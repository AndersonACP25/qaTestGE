import { useEffect, useRef, useState } from "react";
import Alert from "../Alert";
import FileDropzone from "../components/FileDropzone";
import { uploadEvidenceFile } from "../api";
import { usePermissions } from "../controllers/ProjectPermissions";
export default function DesignEvidencePanel({
  projectId,
  targetId,
}: {
  projectId: string;
  targetId?: string;
}) {
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [saved, setSaved] = useState<{ id: string; name: string }[]>([]);
  const alive = useRef(true),
    locked = useRef(false);
  const allowed = usePermissions().can("evidence.write");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <details className="design-evidence" aria-label="Evidencias del diseño">
      <summary>Evidencias opcionales</summary>
      <div className="design-evidence__content layout__stack">
        <p>
          {targetId
            ? `Anexa el archivo al registro ${targetId}.`
            : "Selecciona un archivo y guarda el registro para poder anexarlo. Los archivos no se guardan en el borrador local ni se envían a IA."}
        </p>
        <FileDropzone
          file={file}
          onFile={(value) => {
            setFile(value);
            setError("");
          }}
          label="Archivo de evidencia del diseño"
          disabled={busy || !allowed}
        />
        <button
          type="button"
          className="workspace__secondary"
          disabled={!allowed || !file || !targetId || busy}
          onClick={() => {
            if (!file || !targetId || locked.current) return;
            if (file.size < 1 || file.size > 2 * 1024 * 1024) {
              setError("Selecciona un archivo de entre 1 byte y 2 MiB.");
              return;
            }
            locked.current = true;
            setBusy(true);
            setError("");
            void uploadEvidenceFile(null, projectId, file, targetId)
              .then((evidence) => {
                if (alive.current) {
                  setSaved((current) => [evidence, ...current]);
                  setFile(null);
                }
              })
              .catch((cause: unknown) => {
                if (alive.current)
                  setError(
                    `${cause instanceof Error ? cause.message : "No se pudo anexar la evidencia."} Consulta Evidencias antes de repetir la carga.`,
                  );
              })
              .finally(() => {
                locked.current = false;
                if (alive.current) setBusy(false);
              });
          }}
        >
          {busy ? "Anexando…" : "Anexar evidencia"}
        </button>
        {error && <Alert tone="error">{error}</Alert>}
        {saved.length > 0 && (
          <div role="status">
            {saved.map((item) => (
              <p key={item.id}>
                Evidencia {item.id} anexada: {item.name}
              </p>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
