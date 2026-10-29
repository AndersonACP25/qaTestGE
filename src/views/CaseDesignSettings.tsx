import { useEffect, useRef, useState } from "react";
import Alert from "../Alert";
import { createCustomCaseType } from "../models/customCaseTypes";
import { renameCaseType, type CasePreferences } from "../models/casePreferences";
import { maxCaseCount } from "../models/caseDesign.model";

export default function CaseDesignSettings({
  preferences,
  onSave,
}: {
  preferences: CasePreferences;
  onSave: (next: CasePreferences) => Promise<void>;
}) {
  const [counts, setCounts] = useState(preferences.counts);
  const [selected, setSelected] = useState(preferences.selected);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setCounts(preferences.counts);
    setSelected(preferences.selected);
  }, [preferences]);
  async function commit(next: CasePreferences, message: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await onSave(next);
      setMessage(message);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar las preferencias.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveType() {
    try {
      const created = editing
        ? renameCaseType(editing, name, preferences.catalog)
        : createCustomCaseType(name, preferences.catalog);
      const catalog = editing
        ? preferences.catalog.map((type) => (type.id === editing ? created : type))
        : [...preferences.catalog, created];
      if (
        await commit(
          { ...preferences, catalog, counts, selected },
          "El tipo ya está disponible en el diseñador.",
        )
      ) {
        setEditing("");
        setName("");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el tipo.");
    }
  }
  return (
    <>
      <div className="account-settings__heading">
        <h2>Diseño de test cases</h2>
        <p>
          Configura los tipos y cantidades iniciales. Puedes editar o eliminar cualquier tipo,
          incluidos los predeterminados. Los cambios se guardan para tu usuario en este navegador y
          no modifican los casos ya guardados.
        </p>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <form
        className="account-settings__new-type"
        onSubmit={(event) => {
          event.preventDefault();
          void saveType();
        }}
      >
        <label className="workspace__field">
          {editing ? "Nombre del tipo" : "Nombre del nuevo tipo"}
          <input
            ref={input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={60}
            disabled={busy}
          />
        </label>
        <button className="button button-primary" type="submit" disabled={busy}>
          {editing ? "Guardar tipo de caso" : "Añadir tipo de caso"}
        </button>
        {editing && (
          <button
            className="workspace__secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              setEditing("");
              setName("");
            }}
          >
            Cancelar edición de tipo
          </button>
        )}
      </form>
      <form
        className="account-settings__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!selected.length) {
            setError("Selecciona al menos un tipo de prueba.");
            return;
          }
          void commit(
            { ...preferences, counts, selected },
            "Las preferencias de diseño se guardaron en este navegador.",
          );
        }}
      >
        <h3>Tipos seleccionados inicialmente</h3>
        <p className="workspace__notice">
          Conserva al menos un tipo. Usa Editar o Eliminar junto a cada nombre.
        </p>
        <div className="account-settings__count-grid">
          {preferences.catalog.map((type) => (
            <div className="account-settings__count-item" key={type.id}>
              <label>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={selected.includes(type.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, type.id]
                        : current.filter((id) => id !== type.id),
                    )
                  }
                />
                <span>{type.label}</span>
              </label>
              <select
                aria-label={`Valor inicial para ${type.label}`}
                disabled={busy}
                value={counts[type.id] ?? 1}
                onChange={(event) =>
                  setCounts((current) => ({ ...current, [type.id]: Number(event.target.value) }))
                }
              >
                {Array.from({ length: maxCaseCount }, (_, index) => (
                  <option key={index + 1}>{index + 1}</option>
                ))}
              </select>
              <div className="account-settings__type-actions">
                <button
                  className="workspace__secondary"
                  type="button"
                  disabled={busy}
                  aria-label={`Editar tipo ${type.label}`}
                  onClick={() => {
                    setEditing(type.id);
                    setName(type.label);
                    setError("");
                    setMessage("");
                    input.current?.focus();
                  }}
                >
                  Editar
                </button>
                <button
                  className="workspace__danger"
                  type="button"
                  disabled={busy}
                  aria-label={`Eliminar tipo ${type.label}`}
                  onClick={() => {
                    void commit(
                      {
                        ...preferences,
                        catalog: preferences.catalog.filter((item) => item.id !== type.id),
                        counts,
                        selected: selected.filter((id) => id !== type.id),
                      },
                      "Tipo eliminado. Los casos guardados se conservan.",
                    );
                    if (editing === type.id) {
                      setEditing("");
                      setName("");
                    }
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="workspace__actions">
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? "Guardando…" : "Guardar valores predeterminados"}
          </button>
        </div>
      </form>
    </>
  );
}
