import type { Activity } from "../../backend/src/models/collaboration.model";
import { useState } from "react";
import Dialog from "../Dialog";
import { auditChanges, AuditChangeDetails } from "./AuditChangeDetails";
export default function AuditTable({ rows, detailed }: { rows: Activity[]; detailed: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const event = detailed ? rows.find((row) => row.id === selected) : undefined;
  const changes = event ? auditChanges(event) : [];
  return (
    <div className="audit-table__scroll">
      <table className="audit-table">
        <caption className="typography__caption">Actividad de la página actual</caption>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Autor</th>
            <th>Recurso / operación</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString("es")}</time>
              </td>
              <td>{row.actorName}</td>
              <td>
                <strong>{row.resourceId}</strong>
                <span>{row.action}</span>
              </td>
              <td>
                {detailed && (row.before || row.after) ? (
                  <button
                    type="button"
                    className="workspace__secondary"
                    onClick={() => setSelected(row.id)}
                  >
                    Ver cambios
                  </button>
                ) : detailed ? (
                  "Sin detalle disponible"
                ) : (
                  "Resumen"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {event && (
        <Dialog
          title={`Cambios de auditoría · ${event.resourceId}`}
          onClose={() => setSelected(null)}
          wide
        >
          <div className="layout__stack">
            <p>
              <strong>{event.actorName}</strong> ·{" "}
              <time dateTime={event.createdAt}>
                {new Date(event.createdAt).toLocaleString("es")}
              </time>
            </p>
            {changes.length ? (
              <AuditChangeDetails changes={changes} />
            ) : (
              <p>Este evento no contiene cambios de campos visibles.</p>
            )}
          </div>
        </Dialog>
      )}
      {!rows.length && <p>No hay actividad para esta página y filtros.</p>}
    </div>
  );
}
