import type { Tag } from "../types";
import { formatCount } from "../utils/pluralization";
export const defaultListingFilters = {
  search: "",
  statusFilter: "Todos",
  typeFilter: "Todos",
  lifecycleFilter: "Todos",
  priority: "Todos",
  severity: "Todos",
  assignee: "Todos",
  tag: "Todos",
  plan: "Todos",
};
export type ListingFilterState = typeof defaultListingFilters;
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
          {statuses.map((status) => (
            <button
              type="button"
              key={status}
              className={`listing-filters__tab${values.statusFilter === status ? " listing-filters__tab--active" : ""}`}
              aria-pressed={values.statusFilter === status}
              onClick={() => onChange({ statusFilter: status })}
            >
              {status}
            </button>
          ))}
        </div>
        <label className="search-field">
          <input
            type="search"
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
