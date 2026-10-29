import { useState } from "react";
import Alert from "./Alert";
import Dialog from "./Dialog";
import type { TableExportData } from "./models/tableExport";
import { recordExportFormats, type ExportFormat } from "./utils/exportRecord";
import { exportTable } from "./utils/exportTable";

export default function TableExport({ data }: { data: TableExportData }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(format: ExportFormat) {
    setBusy(true);
    setError("");
    try {
      await exportTable(format, data);
      setOpen(false);
    } catch {
      setError("No se pudo exportar la tabla. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
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
            Se exportarán {data.rows.length} registros con los filtros actuales y las columnas del
            listado.
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
