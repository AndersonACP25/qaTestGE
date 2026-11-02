import { useEffect, useState } from "react";
import { api } from "../api";
import Alert from "../Alert";
import type { ApiCase, ApiBug } from "../contracts/apiContracts";
import { formatCount } from "../utils/pluralization";
export default function CoverageResourceSearch({
  projectId,
  kind,
  onSelect,
  selectedIds = [],
  disabled = false,
}: {
  projectId: string;
  kind: "test-cases" | "bugs";
  onSelect: (id: string, title: string) => void;
  selectedIds?: string[];
  disabled?: boolean;
}) {
  const [search, setSearch] = useState(""),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [items, setItems] = useState<(ApiCase | ApiBug)[]>([]);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setItems([]);
    setError("");
    const timer = setTimeout(() => {
      void api<(ApiCase | ApiBug)[]>(
        `/${kind}?projectId=${encodeURIComponent(projectId)}&limit=50&search=${encodeURIComponent(search)}`,
        { signal: abort.signal },
      )
        .then((value) => {
          if (!abort.signal.aborted) setItems(value);
        })
        .catch((cause: unknown) => {
          if (!abort.signal.aborted)
            setError(cause instanceof Error ? cause.message : "No se pudo buscar.");
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [projectId, kind, search, revision]);
  return (
    <div className="coverage-search">
      <label className="workspace__field">
        {kind === "bugs" ? "Buscar bug para vincular" : "Buscar caso para vincular"}
        <input
          type="search"
          maxLength={120}
          value={search}
          disabled={disabled}
          placeholder="Buscar por título"
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="coverage-search__heading">
        <strong>{kind === "bugs" ? "Bugs disponibles" : "Casos disponibles"}</strong>
        <span>
          {loading ? "Buscando…" : formatCount(items.length, "coincidencia", "coincidencias")}
        </span>
      </div>
      {error && (
        <Alert tone="error">
          {error}
          <button
            type="button"
            className="workspace__secondary"
            onClick={() => setRevision((value) => value + 1)}
          >
            Reintentar búsqueda
          </button>
        </Alert>
      )}
      <ul
        className="coverage-search__results"
        aria-label={kind === "bugs" ? "Resultados de bugs" : "Resultados de casos"}
        aria-busy={loading}
      >
        {items.map((item) => {
          const selected = selectedIds.includes(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-label={`${item.id} · ${item.title}${selected ? " · Seleccionado" : ""}`}
                disabled={disabled || loading || selected}
                onClick={() => onSelect(item.id, item.title)}
              >
                <span className="coverage-search__id">{item.id}</span>
                <span className="coverage-search__identity">
                  <strong>{item.title}</strong>
                  <span>
                    {item.status} ·{" "}
                    {"priority" in item
                      ? `Prioridad ${item.priority}`
                      : (item.testType ?? "Funcional")}
                  </span>
                </span>
                <span className="coverage-search__action">
                  {selected ? "Seleccionado" : "Vincular +"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {loading && <p role="status">Buscando registros…</p>}
      {!loading && !error && !items.length && <p>No hay coincidencias. Prueba otro título.</p>}
      <p className="typography__caption">
        Hasta 50 coincidencias. Selecciona el registro para vincularlo.
      </p>
    </div>
  );
}
