import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Alert from "../Alert";
import { usePermissions } from "../controllers/ProjectPermissions";
import type { CoveragePage, Requirement } from "../contracts/analyticsContracts";
import type { ApiCase, ApiBug } from "../contracts/apiContracts";
import { formatCount } from "../utils/pluralization";
function ResourceSearch({
  projectId,
  kind,
  onSelect,
}: {
  projectId: string;
  kind: "test-cases" | "bugs";
  onSelect: (id: string, title: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => {
      void api<(ApiCase | ApiBug)[]>(
        `/${kind}?projectId=${encodeURIComponent(projectId)}&limit=50&search=${encodeURIComponent(search)}`,
        { signal: abort.signal },
      )
        .then((v) => {
          if (!abort.signal.aborted) {
            setItems(v);
            setError("");
          }
        })
        .catch((e: unknown) => {
          if (!abort.signal.aborted) {
            setItems([]);
            setError(e instanceof Error ? e.message : "No se pudo buscar.");
          }
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [projectId, kind, search]);
  return (
    <div>
      <label className="workspace__field">
        {kind === "bugs" ? "Buscar bug para vincular" : "Buscar caso para vincular"}
        <input value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="analytics__choices">
        {items.map((i) => (
          <button
            type="button"
            className="workspace__secondary"
            key={i.id}
            onClick={() => onSelect(i.id, i.title)}
          >
            {i.id} · {i.title}
          </button>
        ))}
      </div>
      <p className="typography__caption">Hasta 50 coincidencias. Refina la búsqueda por título.</p>
    </div>
  );
}
export default function CoverageView({
  projectId,
  refreshRevision = 0,
}: {
  projectId: string;
  refreshRevision?: number;
}) {
  const canWrite = usePermissions().can("cases.write");
  const [offset, setOffset] = useState(0),
    [revision, setRevision] = useState(0);
  const [matrix, setMatrix] = useState<CoveragePage | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [requirementTotal, setRequirementTotal] = useState(0);
  const [reqOffset, setReqOffset] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Requirement | null>(null);
  const [code, setCode] = useState(""),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState("");
  const [selected, setSelected] = useState<{ id: string; title: string }[]>([]);
  const [link, setLink] = useState<{ requirementId: string; caseId: string } | null>(null);
  const creationRequests = useRef(new Map<string, string>());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setMatrix(null);
    void Promise.all([
      api<CoveragePage>(`/coverage-matrix?projectId=${projectId}&limit=50&offset=${offset}`, {
        signal: abort.signal,
      }),
      api<{ items: Requirement[]; total: number }>(
        `/requirements?projectId=${projectId}&limit=50&offset=${reqOffset}`,
        { signal: abort.signal },
      ),
    ])
      .then(([m, r]) => {
        if (!abort.signal.aborted) {
          setMatrix(m);
          setRequirements(r.items);
          setRequirementTotal(r.total);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : "No se pudo cargar la cobertura.");
      });
    return () => abort.abort();
  }, [projectId, offset, reqOffset, revision, refreshRevision]);
  function reset() {
    setEditing(null);
    setCode("");
    setTitle("");
    setDescription("");
    setSelected([]);
    creationRequests.current.clear();
  }
  async function act(work: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      if (alive.current) {
        setMessage(success);
        setRevision((v) => v + 1);
        setOffset(0);
      }
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div className="analytics coverage">
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      {canWrite && (
        <section className="workspace__panel">
          <h2 className="typography__section">
            {editing ? "Editar requisito" : "Nuevo requisito"}
          </h2>
          <form
            className="analytics__form"
            onSubmit={(e) => {
              e.preventDefault();
              void act(
                async () => {
                  const body = {
                    projectId,
                    code,
                    title,
                    description,
                    caseIds: selected.map((s) => s.id),
                    ...(editing ? { version: editing.version } : {}),
                  };
                  const serialized = JSON.stringify(body);
                  const key = creationRequests.current.get(serialized) ?? crypto.randomUUID();
                  creationRequests.current.set(serialized, key);
                  await api<Requirement>(
                    editing ? `/requirements/${editing.id}` : "/requirements",
                    {
                      method: editing ? "PATCH" : "POST",
                      headers: editing ? {} : { "Idempotency-Key": key },
                      body: serialized,
                    },
                  );
                  if (alive.current) reset();
                },
                editing ? "Requisito actualizado." : "Requisito creado.",
              );
            }}
          >
            <label className="workspace__field">
              Código
              <input
                required
                maxLength={60}
                value={code}
                disabled={busy}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <label className="workspace__field">
              Título
              <input
                required
                maxLength={200}
                value={title}
                disabled={busy}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="workspace__field">
              Descripción
              <textarea
                maxLength={5000}
                value={description}
                disabled={busy}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <ResourceSearch
              projectId={projectId}
              kind="test-cases"
              onSelect={(id, t) => {
                if (!busy)
                  setSelected((v) =>
                    v.some((i) => i.id === id) || v.length >= 100 ? v : [...v, { id, title: t }],
                  );
              }}
            />
            <ul>
              {selected.map((s) => (
                <li key={s.id}>
                  {s.id} · {s.title}{" "}
                  <button
                    type="button"
                    className="workspace__secondary"
                    disabled={busy}
                    onClick={() => setSelected((v) => v.filter((i) => i.id !== s.id))}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
            <p className="typography__caption">
              Máximo 100 casos por requisito. Un requisito sin casos aparece como pendiente de
              cobertura.
            </p>
            <div className="quality__actions">
              <button className="button button-primary" disabled={busy}>
                {busy ? "Guardando…" : "Guardar requisito"}
              </button>
              <button
                type="button"
                className="workspace__secondary"
                disabled={busy}
                onClick={reset}
              >
                Limpiar formulario
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="workspace__panel">
        <h2 className="typography__section">Requisitos</h2>
        <p>{formatCount(requirementTotal, "requisito", "requisitos")}</p>
        <div className="analytics__choices">
          {requirements.map((r) => (
            <article className="coverage__requirement" key={r.id}>
              <strong>
                {r.code} · {r.title}
              </strong>
              {canWrite && (
                <div className="quality__actions">
                  <button
                    className="workspace__secondary"
                    disabled={busy}
                    onClick={() => {
                      setEditing(r);
                      setCode(r.code);
                      setTitle(r.title);
                      setDescription(r.description);
                      setSelected(r.caseIds.map((id) => ({ id, title: "" })));
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="workspace__danger"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`¿Eliminar el requisito ${r.code}?`))
                        void act(async () => {
                          await api<void>(
                            `/requirements/${r.id}?projectId=${projectId}&version=${r.version}`,
                            { method: "DELETE", body: JSON.stringify({}) },
                          );
                          if (alive.current && editing?.id === r.id) reset();
                        }, "Requisito eliminado.");
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
        <div className="analytics__pagination">
          <button
            className="workspace__secondary"
            disabled={!reqOffset}
            onClick={() => setReqOffset((v) => Math.max(0, v - 50))}
          >
            Anteriores
          </button>
          <span>Página {Math.floor(reqOffset / 50) + 1}</span>
          <button
            className="workspace__secondary"
            disabled={reqOffset + 50 >= requirementTotal}
            onClick={() => setReqOffset((v) => v + 50)}
          >
            Siguientes
          </button>
        </div>
      </section>
      <section className="workspace__panel">
        <h2 className="typography__section">Requisito ↔ caso ↔ bug</h2>
        <p className="typography__caption">
          Los vínculos de bug pertenecen al caso y se muestran en todos sus requisitos. La ausencia
          de bugs no equivale a ausencia de cobertura.
        </p>
        {!matrix ? (
          <p role="status">Cargando matriz…</p>
        ) : (
          <>
            <div className="analytics__matrix coverage__matrix">
              <table aria-label="Matriz de cobertura de requisitos">
                <thead>
                  <tr>
                    <th scope="col">Requisito</th>
                    <th scope="col">Caso</th>
                    <th scope="col">Bug</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.rows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        {r.code} · {r.title}
                      </td>
                      <td>{r.caseId ? `${r.caseId} · ${r.caseTitle}` : "Sin caso vinculado"}</td>
                      <td>
                        {r.bugId ? `${r.bugId} · ${r.bugTitle}` : "Sin bug vinculado"}
                        {canWrite && r.caseId && (
                          <button
                            className="workspace__secondary coverage__link-button"
                            onClick={() =>
                              setLink({ requirementId: r.requirementId, caseId: r.caseId! })
                            }
                          >
                            Vincular bug
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!matrix.rows.length && <p>Aún no hay requisitos.</p>}
            <div className="analytics__pagination">
              <button
                className="workspace__secondary"
                disabled={!offset}
                onClick={() => setOffset((v) => Math.max(0, v - 50))}
              >
                Anterior
              </button>
              <span>
                Página {Math.floor(offset / 50) + 1} · {formatCount(matrix.total, "fila", "filas")}
              </span>
              <button
                className="workspace__secondary"
                disabled={offset + 50 >= matrix.total}
                onClick={() => setOffset((v) => v + 50)}
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </section>
      {link && canWrite && (
        <section className="workspace__panel">
          <h2 className="typography__section">Vincular bug a {link.caseId}</h2>
          <ResourceSearch
            projectId={projectId}
            kind="bugs"
            onSelect={(id) => {
              void act(async () => {
                await api<void>(`/coverage-links?projectId=${projectId}`, {
                  method: "POST",
                  body: JSON.stringify({ ...link, bugId: id }),
                });
                if (alive.current) setLink(null);
              }, "Bug vinculado al caso del requisito.");
            }}
          />
          <button className="workspace__secondary" onClick={() => setLink(null)}>
            Cancelar vínculo
          </button>
        </section>
      )}
    </div>
  );
}
