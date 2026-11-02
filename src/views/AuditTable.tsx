import type { Activity } from "../../backend/src/models/collaboration.model";
import ActivityList from "./ProjectActivityView";
export default function AuditTable({ rows, detailed }: { rows: Activity[]; detailed: boolean }) {
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
              <td>{detailed ? <ActivityList rows={[row]} /> : "Resumen"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p>No hay actividad para esta página y filtros.</p>}
    </div>
  );
}
