import { useRef, useEffect, useState } from "react";
import Alert from "../Alert";
import Dialog from "../Dialog";
import FileDropzone from "../components/FileDropzone";
import { uploadEvidenceFile } from "../api";
import type { Evidence } from "../types";
export default function EvidenceUploadDialog({
  projectId,
  targetId,
  onClose,
  onSaved,
}: {
  projectId: string;
  targetId: string;
  onClose: () => void;
  onSaved: (item: Evidence) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <Dialog
      title={`Subir evidencia a ${targetId}`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="evidence-upload"
        onSubmit={(event) => {
          event.preventDefault();
          if (!file || busy) return;
          if (file.size > 2 * 1024 * 1024 || file.size === 0) {
            setError("Selecciona un archivo de entre 1 byte y 2 MiB.");
            return;
          }
          setBusy(true);
          setError("");
          void uploadEvidenceFile(null, projectId, file, targetId)
            .then((item) => {
              if (alive.current) onSaved(item);
            })
            .catch((cause: unknown) => {
              if (alive.current)
                setError(cause instanceof Error ? cause.message : "No se pudo subir la evidencia.");
            })
            .finally(() => {
              if (alive.current) setBusy(false);
            });
        }}
      >
        <p>El archivo quedará vinculado a {targetId}. Máximo 2 MiB.</p>
        <FileDropzone file={file} onFile={setFile} disabled={busy} />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="workspace__actions">
          <button type="button" className="workspace__secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button className="button button-primary" disabled={busy || !file}>
            {busy ? "Subiendo…" : "Guardar evidencia"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
