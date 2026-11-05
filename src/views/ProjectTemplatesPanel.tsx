import { availableTemplateDefaults } from "../models/templateDefaults";
import { useEffect, useRef, useState } from "react";
import Alert from "../Alert";
import TagPicker from "../TagPicker";
import type { BugTemplate } from "../api";
import type { Tag } from "../types";
import type { DesignTemplatesController } from "../controllers/useDesignTemplates";
import type {
  CaseTemplate,
  DesignTemplates,
  TemplateDefaults,
} from "../../backend/src/models/design-templates.model";

const emptyDefaults: TemplateDefaults = { tagIds: [], assigneeUserId: null };
const blankCase = (): CaseTemplate => ({
  ...emptyDefaults,
  id: crypto.randomUUID(),
  name: "",
  title: "",
  testType: "Funcional",
  suite: "",
  preconditions: "",
  steps: [{ action: "", expectedResult: "" }],
});
const caseFields = [
  ["name", "Nombre de la plantilla de caso", 100],
  ["title", "Título del caso", 200],
  ["testType", "Tipo de prueba", 100],
  ["suite", "Suite opcional", 100],
] as const;

export default function ProjectTemplatesPanel({
  mode,
  controller,
  bugs,
  tags,
  members,
  resourcesError,
  resourcesLoading,
}: {
  mode: "bug" | "case";
  controller: DesignTemplatesController;
  bugs: BugTemplate[];
  tags: Tag[];
  members: { id: string; name: string }[];
  resourcesError: string;
  resourcesLoading: boolean;
}) {
  const { data, error, save, refresh } = controller;
  const loading = controller.loading || resourcesLoading;
  const [draft, setDraft] = useState(blankCase);
  const [bugId, setBugId] = useState("");
  const [bugDraft, setBugDraft] = useState<TemplateDefaults>(emptyDefaults);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [message, setMessage] = useState("");
  const alive = useRef(false);
  const locked = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const isCase = mode === "case";
  const chosen = isCase ? draft : bugDraft;
  const updateDefaults = (next: TemplateDefaults) =>
    isCase ? setDraft((value) => ({ ...value, ...next })) : setBugDraft(next);
  const validDefaults = availableTemplateDefaults(chosen, tags, members);
  const { tagIds, assigneeUserId } = validDefaults;
  async function commit(next: DesignTemplates, text: string, reset = false) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setFailure("");
    setMessage("");
    try {
      await save(next);
      if (alive.current) {
        setMessage(text);
        if (reset) setDraft(blankCase());
      }
    } catch (cause) {
      if (alive.current)
        setFailure(cause instanceof Error ? cause.message : "No se pudo guardar la plantilla.");
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const editing = data.cases.some(({ id }) => id === draft.id);
  return (
    <div className="account-settings__template-project layout__stack">
      <div className="layout__stack">
        <h3 className="typography__heading">
          {isCase ? "Plantillas de casos de prueba" : "Tags y responsable para plantillas de bugs"}
        </h3>
        <p>
          Estas plantillas y valores predeterminados son personales y corresponden al proyecto
          seleccionado.
        </p>
      </div>
      {loading && <p role="status">Cargando plantillas del proyecto…</p>}
      {error && <Alert tone="error">{error}</Alert>}
      {failure && <Alert tone="error">{failure}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      {(failure || error) && (
        <button
          type="button"
          className="workspace__secondary"
          disabled={busy}
          onClick={() => {
            setFailure("");
            setBugId("");
            setBugDraft(emptyDefaults);
            setDraft(blankCase());
            refresh();
          }}
        >
          Actualizar plantillas
        </button>
      )}
      {!isCase && !bugs.length && (
        <p>Crea primero una plantilla de bug para configurar sus valores.</p>
      )}
      {!loading && !error && (isCase || bugs.length > 0) && (
        <form
          className="layout__stack"
          aria-busy={busy}
          onSubmit={(event) => {
            event.preventDefault();
            if (busy || resourcesError) return;
            if (isCase) {
              const item = { ...draft, ...validDefaults };
              const cases = editing
                ? data.cases.map((row) => (row.id === draft.id ? item : row))
                : [...data.cases, item];
              void commit({ ...data, cases }, "Plantilla de caso guardada.", true);
            } else if (bugId && bugs.some(({ id }) => id === bugId)) {
              const remaining = data.bugDefaults.filter(
                ({ templateId }) =>
                  templateId !== bugId && bugs.some(({ id }) => id === templateId),
              );
              const bugDefaults =
                tagIds.length || assigneeUserId
                  ? [...remaining, { templateId: bugId, ...validDefaults }]
                  : remaining;
              void commit({ ...data, bugDefaults }, "Valores de la plantilla de bug guardados.");
            }
          }}
        >
          <fieldset className="workspace__fieldset layout__stack" disabled={busy}>
            {isCase ? (
              <>
                {caseFields.map(([key, label, maxLength]) => (
                  <label className="workspace__field" key={key}>
                    {label}
                    <input
                      value={draft[key]}
                      maxLength={maxLength}
                      required={key !== "suite"}
                      onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                    />
                  </label>
                ))}
                <label className="workspace__field">
                  Precondiciones de la plantilla
                  <textarea
                    rows={3}
                    maxLength={10000}
                    value={draft.preconditions}
                    onChange={(event) => setDraft({ ...draft, preconditions: event.target.value })}
                  />
                </label>
                {draft.steps.map((step, index) => (
                  <fieldset className="workspace__fieldset layout__stack" key={index}>
                    <legend>Paso {index + 1}</legend>
                    {(
                      [
                        ["action", "Acción"],
                        ["expectedResult", "Resultado esperado"],
                      ] as const
                    ).map(([field, label]) => (
                      <label className="workspace__field" key={field}>
                        {label}
                        <textarea
                          rows={2}
                          required
                          maxLength={10000}
                          value={step[field]}
                          onChange={(event) => {
                            const value = event.target.value;
                            setDraft((current) => ({
                              ...current,
                              steps: current.steps.map((row, i) =>
                                i === index ? { ...row, [field]: value } : row,
                              ),
                            }));
                          }}
                        />
                      </label>
                    ))}
                    <button
                      className="workspace__secondary"
                      type="button"
                      disabled={draft.steps.length < 2}
                      onClick={() =>
                        setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) })
                      }
                    >
                      Quitar paso {index + 1}
                    </button>
                  </fieldset>
                ))}
                <button
                  className="workspace__secondary"
                  type="button"
                  disabled={draft.steps.length >= 25}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      steps: [...draft.steps, { action: "", expectedResult: "" }],
                    })
                  }
                >
                  Añadir paso a la plantilla
                </button>
              </>
            ) : (
              <label className="workspace__field">
                Plantilla de bug
                <select
                  required
                  value={bugId}
                  onChange={(event) => {
                    const id = event.target.value;
                    setBugId(id);
                    setBugDraft(
                      data.bugDefaults.find(({ templateId }) => templateId === id) ?? emptyDefaults,
                    );
                    setMessage("");
                  }}
                >
                  <option value="">Selecciona una plantilla</option>
                  {bugs.map(({ id, name }) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(isCase || bugId) && (
              <>
                <label className="workspace__field">
                  Responsable predeterminado
                  <select
                    value={assigneeUserId ?? ""}
                    onChange={(event) =>
                      updateDefaults({ ...chosen, assigneeUserId: event.target.value || null })
                    }
                  >
                    <option value="">Sin asignar</option>
                    {members.map(({ id, name }) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <TagPicker
                  tags={tags}
                  error={resourcesError}
                  selectedIds={tagIds}
                  onChange={(next) => updateDefaults({ ...chosen, tagIds: next })}
                />
              </>
            )}
            <div className="layout__actions">
              <button
                className="button button-primary"
                disabled={Boolean(resourcesError) || (!isCase && !bugId)}
              >
                {busy
                  ? "Guardando…"
                  : isCase
                    ? "Guardar plantilla de caso"
                    : "Guardar tags y responsable"}
              </button>
              {isCase && editing && (
                <button
                  type="button"
                  className="workspace__secondary"
                  onClick={() => setDraft(blankCase())}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </fieldset>
        </form>
      )}
      {isCase && data.cases.length > 0 && (
        <div className="account-settings__templates">
          {data.cases.map((item) => (
            <article className="account-settings__template" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p>
                  {item.title} · {item.testType}
                </p>
              </div>
              <div className="account-settings__template-actions">
                <button
                  className="workspace__secondary"
                  type="button"
                  disabled={busy || loading}
                  aria-label={`Editar plantilla ${item.name}`}
                  onClick={() => {
                    setDraft(item);
                    setMessage("");
                    setFailure("");
                  }}
                >
                  Editar
                </button>
                <button
                  className="workspace__danger"
                  type="button"
                  disabled={busy || loading}
                  aria-label={`Eliminar plantilla ${item.name}`}
                  onClick={() =>
                    void commit(
                      { ...data, cases: data.cases.filter(({ id }) => id !== item.id) },
                      "Plantilla de caso eliminada.",
                      draft.id === item.id,
                    )
                  }
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
