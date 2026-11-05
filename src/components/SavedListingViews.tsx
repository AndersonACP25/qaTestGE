import { useEffect, useState } from "react";
import Alert from "../Alert";
import {
  changeListingViews,
  readListingViews,
  type ListingFilterState,
  type SavedListingView,
} from "../models/listingViews";

export default function SavedListingViews({
  storageKey,
  filters,
  onApply,
}: {
  storageKey: string;
  filters: ListingFilterState;
  onApply: (filters: ListingFilterState) => void;
}) {
  const [views, setViews] = useState<SavedListingView[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const view = views.find((item) => item.id === selected);
  useEffect(() => {
    function refresh() {
      try {
        setViews(readListingViews(storageKey));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudieron leer las vistas.");
      }
    }
    refresh();
    function changed(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) refresh();
    }
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [storageKey]);

  async function update(action: Parameters<typeof changeListingViews>[1]) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setViews(await changeListingViews(storageKey, action));
      if ("deleteId" in action) setSelected("");
      else setName("");
      setMessage("deleteId" in action ? "Vista eliminada." : "Vista guardada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar los cambios.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="layout__inset" aria-label="Vistas guardadas">
      <summary>Vistas guardadas</summary>
      <div className="layout__stack">
        <p>
          Guarda combinaciones de filtros para esta cuenta, proyecto y listado en este navegador.
        </p>
        {error && <Alert tone="error">{error}</Alert>}
        {message && <p role="status">{message}</p>}
        <div className="layout__actions">
          <label className="workspace__field">
            Vista guardada
            <select
              aria-label="Vista guardada"
              value={view?.id ?? ""}
              onChange={(event) => setSelected(event.target.value)}
              disabled={busy || !views.length}
            >
              <option value="">
                {views.length ? "Selecciona una vista" : "Todavía no hay vistas"}
              </option>
              {views.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="workspace__secondary"
            disabled={busy || !view}
            onClick={() => {
              if (!view) return;
              onApply(view.filters);
              setMessage("Vista aplicada.");
            }}
          >
            Aplicar vista
          </button>
          <button
            type="button"
            className="workspace__danger"
            disabled={busy || !view}
            onClick={() => {
              if (view) void update({ deleteId: view.id });
            }}
          >
            Eliminar vista
          </button>
        </div>
        <form
          className="layout__actions"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) void update({ name, filters });
          }}
        >
          <label className="workspace__field">
            Nombre de la vista
            <input
              required
              maxLength={60}
              value={name}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button className="workspace__secondary" disabled={busy || !name.trim()}>
            {busy ? "Procesando…" : "Guardar filtros actuales"}
          </button>
        </form>
      </div>
    </details>
  );
}
