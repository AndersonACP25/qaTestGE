import type { Tag } from "../types";
import { formatCount } from "../utils/pluralization";
import type { ListingFilterState } from "../models/listingViews";
export { defaultListingFilters } from "../models/listingViews";
export default function ListingFilters({
  kind,
  statuses,
  values,
  onChange,
  onClear,
  members,
  tags,
  types,
  plans,
}: {
  kind: "bugs" | "cases" | "runs";
  statuses: string[];
  values: ListingFilterState;
  onChange: (patch: Partial<ListingFilterState>) => void;
  onClear: () => void;
  members: { id: string; name: string }[];
  tags: Tag[];
  types: string[];
  plans: string[];
}) {
  const statusOptions = statuses.includes(values.statusFilter)
    ? statuses
    : [...statuses, values.statusFilter];
  const active = Object.entries(values).filter(([key, value]) =>
    key === "search" ? Boolean(value.trim()) : value !== "Todos",
  ).length;
  return (
    <section
      className="record-filters"
      aria-label={`Filtros de ${kind === "bugs" ? "bugs" : kind === "cases" ? "casos de prueba" : "Test Runs"}`}
    >
      <header className="record-filters__heading">
        <div>
          <h2 className="typography__heading">Filtros</h2>
          <span>{formatCount(active, "filtro activo", "filtros activos")}</span>
        </div>
        <button type="button" className="workspace__secondary" onClick={onClear} disabled={!active}>
          Limpiar filtros
        </button>
      </header>
      <div className="listing-toolbar listing-filters">
        <div className="listing-filters__tabs" role="group" aria-label="Filtrar por estado">
          {statusOptions.map((status) => (
            <button
              type="button"
              key={status}
              className={`listing-filters__tab${values.statusFilter === status ? " listing-filters__tab--active" : ""}`}
              aria-pressed={values.statusFilter === status}
              onClick={() => onChange({ statusFilter: status })}
            >
              {status}
              {statuses.includes(status) ? "" : " (no disponible)"}
            </button>
          ))}
        </div>
        <label className="search-field">
          <input
            type="search"
            maxLength={200}
            aria-label="Buscar registros"
            value={values.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Identificador, título o texto…"
          />
        </label>
      </div>
      <div className="record-filters__fields">
        {kind === "bugs" && (
          <>
            <label className="workspace__field">
              Filtrar prioridad
              <select
                value={values.priority}
                onChange={(event) => onChange({ priority: event.target.value })}
              >
                {["Todos", "Crítica", "Alta", "Media", "Baja"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="workspace__field">
              Filtrar severidad
              <select
                value={values.severity}
                onChange={(event) => onChange({ severity: event.target.value })}
              >
                {["Todos", "Crítica", "Alta", "Media", "Baja"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </>
        )}
        {kind === "cases" && (
          <>
            <label className="workspace__field">
              Tipo de prueba
              <select
                value={values.typeFilter}
                onChange={(event) => onChange({ typeFilter: event.target.value })}
              >
                <option>Todos</option>
                {values.typeFilter !== "Todos" && !types.includes(values.typeFilter) && (
                  <option value={values.typeFilter}>{values.typeFilter} (no disponible)</option>
                )}
                {types.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="workspace__field">
              Estado del caso
              <select
                value={values.lifecycleFilter}
                onChange={(event) => onChange({ lifecycleFilter: event.target.value })}
              >
                {["Todos", "Borrador", "Listo", "Obsoleto"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="workspace__field">
          Filtrar responsable
          <select
            value={values.assignee}
            onChange={(event) => onChange({ assignee: event.target.value })}
          >
            <option>Todos</option>
            <option value="Sin asignar">Sin asignar</option>
            {values.assignee !== "Todos" &&
              values.assignee !== "Sin asignar" &&
              !members.some((member) => member.id === values.assignee) && (
                <option value={values.assignee}>Responsable no disponible</option>
              )}
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <label className="workspace__field">
          Filtrar por tag
          <select value={values.tag} onChange={(event) => onChange({ tag: event.target.value })}>
            <option>Todos</option>
            <option value="Sin tags">Sin tags</option>
            {values.tag !== "Todos" &&
              values.tag !== "Sin tags" &&
              !tags.some((tag) => tag.id === values.tag) && (
                <option value={values.tag}>Tag no disponible</option>
              )}
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>
        {kind === "runs" && (
          <label className="workspace__field">
            Filtrar Test Plan
            <select
              value={values.plan}
              onChange={(event) => onChange({ plan: event.target.value })}
            >
              <option>Todos</option>
              <option value="Sin plan">Sin plan</option>
              {values.plan !== "Todos" &&
                values.plan !== "Sin plan" &&
                !plans.includes(values.plan) && (
                  <option value={values.plan}>{values.plan} (no disponible)</option>
                )}
              {plans.map((plan) => (
                <option key={plan}>{plan}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </section>
  );
}
