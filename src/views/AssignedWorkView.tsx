import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Alert from "../Alert";
import { formatCount } from "../utils/pluralization";
import type { ResourceTarget } from "../../backend/src/models/collaboration.model";
import type { AssignedWorkPage } from "../../backend/src/models/assigned-work.model";
const kindLabels = { bug: "Bug", case: "Test Case", run: "Test Run" };
export default function AssignedWorkView({
  projectId,
  userName,
  refreshRevision = 0,
  onOpen,
}: {
  projectId: string;
  userName: string;
  refreshRevision?: number;
  onOpen: (target: ResourceTarget, signal: AbortSignal) => Promise<boolean>;
}) {
  const [filters, setFilters] = useState({ kind: "", status: "", search: "" }),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<AssignedWorkPage | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [opening, setOpening] = useState("");
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError("");
    const query = new URLSearchParams({ projectId, page: String(page), pageSize: "25" });
    for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
    void api<AssignedWorkPage>(`/assigned-work?${query}`, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "No se pudieron cargar las asignaciones.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [projectId, page, filters, revision, refreshRevision]);
  return (
    <section className="assigned-work layout__stack">
      <header className="assigned-work__heading">
        <div>
          <span className="typography__caption">ASIGNADO A TI</span>
          <h2 className="typography__section">Trabajo de {userName}</h2>
          <p>Bugs, casos y ejecuciones asignados a tu cuenta en este proyecto.</p>
        </div>
        <button
          className="workspace__secondary"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          Actualizar asignaciones
        </button>
      </header>
      <form
        className="assigned-work__filters"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setFilters({
            kind: String(form.get("kind") ?? ""),
            status: String(form.get("status") ?? "").trim(),
            search: String(form.get("search") ?? "").trim(),
          });
          setPage(1);
        }}
      >
        <label className="workspace__field">
          Buscar asignaciones
          <input
            type="search"
            name="search"
            maxLength={120}
            placeholder="Identificador, título o clasificación"
          />
        </label>
        <label className="workspace__field">
          Tipo de asignación
          <select name="kind">
            <option value="">Todos</option>
            <option value="bug">Bugs</option>
            <option value="case">Test Cases</option>
            <option value="run">Test Runs</option>
          </select>
        </label>
        <label className="workspace__field">
          Estado asignado
          <input name="status" maxLength={60} placeholder="Ej.: Abierto" />
        </label>
        <button className="button button-primary" disabled={loading}>
          Buscar
        </button>
        <button
          type="reset"
          className="workspace__secondary"
          onClick={() => {
            setFilters({ kind: "", status: "", search: "" });
            setPage(1);
          }}
        >
          Limpiar
        </button>
      </form>
      {error && <Alert tone="error">{error}</Alert>}
      {loading ? (
        <p role="status">Cargando asignaciones…</p>
      ) : (
        data && (
          <>
            <p>{formatCount(data.total, "registro asignado", "registros asignados")}</p>
            <div className="assigned-work__list">
              {data.items.map((item) => (
                <article
                  className={`assigned-work__item assigned-work__item--${item.kind}`}
                  key={`${item.kind}:${item.id}`}
                >
                  <span className="assigned-work__kind">{kindLabels[item.kind]}</span>
                  <button
                    className="assigned-work__title"
                    disabled={Boolean(opening)}
                    onClick={() => {
                      const abort = new AbortController();
                      operation.current = abort;
                      setOpening(item.id);
                      setError("");
                      void onOpen({ kind: item.kind, id: item.id }, abort.signal)
                        .catch((cause: unknown) => {
                          if (!abort.signal.aborted)
                            setError(
                              cause instanceof Error
                                ? cause.message
                                : "No se pudo abrir el registro.",
                            );
                        })
                        .finally(() => {
                          if (!abort.signal.aborted) setOpening("");
                        });
                    }}
                  >
                    <strong>{item.id}</strong>
                    {item.title}
                  </button>
                  <span className="work-item__status">{item.status}</span>
                  <span>{item.classification}</span>
                </article>
              ))}
            </div>
            {!data.items.length && <p>No hay asignaciones que coincidan con los filtros.</p>}
            <nav
              className="assigned-work__pagination layout__actions"
              aria-label="Paginación de asignaciones"
            >
              <button
                className="workspace__secondary"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Anterior
              </button>
              <span>
                Página {page} de {Math.max(1, Math.ceil(data.total / 25))}
              </span>
              <button
                className="workspace__secondary"
                disabled={page * 25 >= data.total}
                onClick={() => setPage((value) => value + 1)}
              >
                Siguiente
              </button>
            </nav>
          </>
        )
      )}
    </section>
  );
}
