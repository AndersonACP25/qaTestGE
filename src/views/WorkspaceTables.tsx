import { Avatar, Icon, Priority, StatusBadge } from "../components/RecordPrimitives";
import type { Bug, BugStatus, CaseStatus, TestCase, TestRun, Tag, Evidence } from "../types";
import { bugStatuses, caseStatuses } from "../types";
function TagBadges({ ids, tags }: { ids: string[]; tags: Tag[] }) {
  const assigned = tags.filter((tag) => ids.includes(tag.id));
  if (!assigned.length) return null;
  return (
    <span className="tags-view__badges" aria-label="Tags asignados">
      {assigned.map((tag) => (
        <span className="tags-view__badge" key={tag.id}>
          <span className="tags-view__swatch" style={{ backgroundColor: tag.color }} />
          {tag.name}
        </span>
      ))}
    </span>
  );
}

function StatusControl<TStatus extends string>({
  status,
  statuses,
  disabled,
  label,
  onChange,
}: {
  status: TStatus;
  statuses: readonly TStatus[];
  disabled: boolean;
  label: string;
  onChange: (status: TStatus) => void;
}) {
  return (
    <select
      className={`workspace__status-select workspace__status-select--${status.toLowerCase().replaceAll(" ", "-")}`}
      aria-label={`Cambiar estado de ${label}`}
      value={status}
      disabled={disabled}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.value as TStatus)}
    >
      {statuses.map((value) => (
        <option key={value} value={value}>
          {value}
        </option>
      ))}
    </select>
  );
}

function RowActions({
  id,
  onEdit,
  onDelete,
}: {
  id: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <span className="workspace-table__actions" onClick={(event) => event.stopPropagation()}>
      {onEdit && (
        <button
          type="button"
          className="workspace__secondary"
          aria-label={`Editar ${id}`}
          onClick={onEdit}
        >
          Editar
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="workspace__danger"
          aria-label={`Eliminar ${id}`}
          onClick={onDelete}
        >
          Eliminar
        </button>
      )}
    </span>
  );
}

export function BugTable({
  bugs,
  tags,
  onSelect,
  onExport,
  onEdit,
  onDelete,
  onStatusChange,
  updatingStatus,
  compact = false,
}: {
  bugs: Bug[];
  tags: Tag[];
  onSelect: (bug: Bug) => void;
  onExport: (bug: Bug) => void;
  onEdit?: (bug: Bug) => void;
  onDelete?: (bug: Bug) => void;
  onStatusChange: (bug: Bug, status: BugStatus) => void;
  updatingStatus: string;
  compact?: boolean;
}) {
  return (
    <div className={`workspace-table__scroll${compact ? " table-compact" : ""}`}>
      <table className="workspace-table__table">
        <thead>
          <tr>
            <th>BUG ID</th>
            <th>TÍTULO</th>
            <th>PRIORIDAD</th>
            <th>ESTADO</th>
            <th>ASIGNADO</th>
            <th>CREADO</th>
            <th>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {bugs.map((bug) => (
            <tr key={bug.id} onClick={() => onSelect(bug)}>
              <td data-label="BUG ID">
                <span className="id-text">{bug.id}</span>
              </td>
              <td data-label="TÍTULO">
                <span className="bug-title">{bug.title}</span>
                <span className="table-project">{bug.project}</span>
                <TagBadges ids={bug.tagIds ?? []} tags={tags} />
              </td>
              <td data-label="PRIORIDAD">
                <Priority level={bug.priority} />
              </td>
              <td data-label="ESTADO">
                {" "}
                <StatusControl
                  label={bug.id}
                  status={bug.status}
                  statuses={bugStatuses}
                  disabled={Boolean(updatingStatus)}
                  onChange={(status) => onStatusChange(bug, status)}
                />
              </td>
              <td data-label="ASIGNADO">
                <span className="assignee">
                  <Avatar initials={bug.assignee} color={bug.color} small />
                  <span>{bug.assignee}</span>
                </span>
              </td>
              <td data-label="CREADO" className="muted-cell">
                {bug.updated}
              </td>
              <td data-label="Acciones">
                <RowActions
                  id={bug.id}
                  onEdit={onEdit ? () => onEdit(bug) : undefined}
                  onDelete={onDelete ? () => onDelete(bug) : undefined}
                />
                <button
                  className="workspace__secondary workspace-table__export"
                  aria-label={`Exportar ${bug.id}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onExport(bug);
                  }}
                >
                  Exportar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CaseTable({
  items,
  tags,
  onSelect,
  onExport,
  onEdit,
  onDelete,
  onStatusChange,
  updatingStatus,
}: {
  items: TestCase[];
  tags: Tag[];
  onSelect: (item: TestCase) => void;
  onExport: (item: TestCase) => void;
  onEdit: (item: TestCase) => void;
  onDelete: (item: TestCase) => void;
  onStatusChange: (item: TestCase, status: CaseStatus) => void;
  updatingStatus: string;
}) {
  return (
    <div className="workspace-table__scroll">
      <table className="workspace-table__table">
        <thead>
          <tr>
            <th>CASO ID</th>
            <th>NOMBRE DEL CASO</th>
            <th>SUITE</th>
            <th>RESPONSABLE</th>
            <th>ESTADO</th>
            <th>CREADO</th>
            <th>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} onClick={() => onSelect(item)}>
              <td data-label="CASO ID">
                <span className="id-text">{item.id}</span>
              </td>
              <td data-label="NOMBRE DEL CASO">
                <span className="bug-title">{item.title}</span>
                <TagBadges ids={item.tagIds ?? []} tags={tags} />
              </td>
              <td data-label="SUITE">
                <span className="suite-badge">{item.suite || "—"}</span>
              </td>
              <td data-label="RESPONSABLE">{item.assigneeName || "Sin asignar"}</td>
              <td data-label="ESTADO">
                <StatusControl
                  label={item.id}
                  status={item.status}
                  statuses={caseStatuses}
                  disabled={Boolean(updatingStatus)}
                  onChange={(status) => onStatusChange(item, status)}
                />
              </td>
              <td data-label="CREADO" className="muted-cell">
                {item.updated}
              </td>
              <td data-label="Acciones">
                <RowActions
                  id={item.id}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item)}
                />
                <button
                  className="workspace__secondary workspace-table__export"
                  aria-label={`Exportar ${item.id}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onExport(item);
                  }}
                >
                  Exportar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RunTable({
  items,
  tags,
  onSelect,
  onExecute,
}: {
  items: TestRun[];
  tags: Tag[];
  onSelect: (item: TestRun, action: "view" | "edit" | "delete") => void;
  onExecute: (item: TestRun) => void;
}) {
  return (
    <div className="workspace-table__scroll">
      <table className="workspace-table__table">
        <thead>
          <tr>
            <th>RUN ID</th>
            <th>NOMBRE DE EJECUCIÓN</th>
            <th>CASOS</th>
            <th>PROGRESO</th>
            <th>ESTADO</th>
            <th>RESPONSABLE</th>
            <th>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} onClick={() => onSelect(item, "view")}>
              <td data-label="RUN ID">
                <span className="id-text">{item.id}</span>
              </td>
              <td data-label="NOMBRE DE EJECUCIÓN">
                <div className="run-table__entry">
                  <button
                    className="workspace-table__open"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(item, "view");
                    }}
                  >
                    {item.title}
                  </button>
                  <button
                    type="button"
                    className="workspace__secondary run-table__execute"
                    aria-label={`${item.status === "Completado" ? "Ver resultados de" : "Ejecutar"} ${item.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (item.status === "Completado") onSelect(item, "view");
                      else onExecute(item);
                    }}
                  >
                    {item.status === "Completado" ? "Ver resultados" : "Ejecutar"}
                  </button>
                </div>
                <TagBadges ids={item.tagIds ?? []} tags={tags} />
              </td>
              <td data-label="CASOS" className="muted-cell">
                {item.cases}
              </td>
              <td data-label="PROGRESO">
                <div className="table-progress">
                  <span>
                    <i style={{ width: `${item.progress}%` }} />
                  </span>
                  {item.progress}%
                </div>
              </td>
              <td data-label="ESTADO">
                <StatusBadge status={item.status} />
              </td>
              <td data-label="RESPONSABLE" className="muted-cell">
                {item.owner}
              </td>
              <td data-label="Acciones">
                <RowActions
                  id={item.id}
                  onEdit={() => onSelect(item, "edit")}
                  onDelete={() => onSelect(item, "delete")}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EvidenceTable({
  items,
  onSelect,
  onActions,
}: {
  items: Evidence[];
  onSelect: (item: Evidence) => void;
  onActions: (item: Evidence) => void;
}) {
  return (
    <div className="workspace-table__scroll">
      <table className="workspace-table__table">
        <thead>
          <tr>
            <th>NOMBRE</th>
            <th>TIPO</th>
            <th>VINCULADO A</th>
            <th>TAMAÑO</th>
            <th>FECHA</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} onClick={() => onSelect(item)}>
              <td data-label="NOMBRE">
                <span className="evidence-name">
                  <span className="evidence-file">
                    <Icon name="file" size={17} />
                  </span>
                  <span>
                    <span className="bug-title">{item.name}</span>
                    <span className="table-project">
                      {item.hasFile ? "Archivo disponible" : "Solo metadatos"}
                    </span>
                  </span>
                </span>
              </td>
              <td data-label="TIPO">
                <span className="suite-badge">{item.type}</span>
              </td>
              <td data-label="VINCULADO A">
                <span className="id-text">{item.related}</span>
              </td>
              <td data-label="TAMAÑO" className="muted-cell">
                {item.size}
              </td>
              <td data-label="FECHA" className="muted-cell">
                {item.date}
              </td>
              <td data-label="Acciones">
                <button
                  type="button"
                  className="row-more"
                  aria-label={`Más opciones para ${item.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onActions(item);
                  }}
                >
                  <Icon name="dots" size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
