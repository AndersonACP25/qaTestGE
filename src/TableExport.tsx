import { useEffect, useRef, useState } from "react";
import { formatCount, pluralize } from "./utils/pluralization";
import Alert from "./Alert";
import Dialog from "./Dialog";
import type { TableExportData } from "./models/tableExport";
import { recordExportFormats, type ExportFormat } from "./utils/exportRecord";
import { exportTable } from "./utils/exportTable";

export default function TableExport({ data }: { data: TableExportData }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(format: ExportFormat) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await exportTable(format, data);
      if (!alive.current) return;
      setMessage("Archivo preparado para descargar.");
      setOpen(false);
    } catch {
      if (alive.current) setError("No se pudo exportar la tabla. Inténtalo de nuevo.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <>
      {message && (
        <Alert tone="success" onDismiss={() => setMessage("")}>
          {message}
        </Alert>
      )}
      <button
        className="table-export__button"
        type="button"
        disabled={!data.rows.length}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        aria-label={`Exportar tabla de ${data.title}`}
      >
        Exportar tabla
      </button>
      {open && (
        <Dialog
          title={`Exportar tabla de ${data.title}`}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p className="workspace__notice">
            {pluralize(data.rows.length, "Se exportará", "Se exportarán")}{" "}
            {formatCount(data.rows.length, "registro", "registros")} de la página visible con los
            filtros actuales y las columnas del listado.
          </p>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="workspace__export-options" aria-busy={busy}>
            {recordExportFormats.map((format) => (
              <button
                className="workspace__export-option"
                type="button"
                key={format}
                disabled={busy}
                onClick={() => void save(format)}
              >
                {busy
                  ? "Preparando…"
                  : `Exportar como ${format === "xlsx" ? "Excel" : format === "md" ? "Markdown" : "PDF"}`}
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </>
  );
}
