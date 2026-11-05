import { availableTemplateDefaults } from "../models/templateDefaults";
import type { DesignTemplates } from "../../backend/src/models/design-templates.model";
import DesignEvidencePanel from "./DesignEvidencePanel";
import Dialog from "../Dialog";
import RichTextarea from "../components/RichTextarea";
import { withStorageLock } from "../models/storageLock";
import { useEffect, useRef, useState } from "react";
import Alert from "../Alert";
import TagPicker from "../TagPicker";
import { api, createBug, type BugTemplate } from "../api";
import type { BugProposal } from "../contracts/apiContracts";
import type { Bug, Tag } from "../types";
import {
  loadBugDraftDocument,
  saveBugDraftDocument,
  bugDraftsKey,
  bugDraftRequestKey,
  prepareBug,
  type BugDraft,
} from "../models/bugDesign";

export default function BugDesignView({
  canProposeWithGemini,
  userId,
  projectId,
  tags,
  tagError,
  members,
  memberError,
  defaults,
  defaultsLoading,
  onSaved,
  onOpenBugs,
}: {
  canProposeWithGemini: boolean;
  userId: string;
  projectId: string;
  tags: Tag[];
  tagError: string;
  members: { id: string; name: string }[];
  memberError: string;
  defaults: DesignTemplates["bugDefaults"];
  defaultsLoading: boolean;
  onSaved: (bug: Bug) => void;
  onOpenBugs: () => void;
}) {
  const alive = useRef(true);
  const proposalRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      proposalRequest.current?.abort();
    };
  }, []);
  const [initial] = useState(() => {
    try {
      return { ...loadBugDraftDocument(userId, projectId), error: "" };
    } catch {
      return {
        revision: "0",
        drafts: [] as BugDraft[],
        error:
          "No se pudieron leer los borradores de este navegador. Puedes preparar y guardar un bug en el proyecto.",
      };
    }
  });
  const [drafts, setDrafts] = useState(initial.drafts);
  const [revision, setRevision] = useState(initial.revision);
  const [source, setSource] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<BugTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateError, setTemplateError] = useState("");
  const [preview, setPreview] = useState<BugDraft | null>(null);
  const [confirmGemini, setConfirmGemini] = useState(false);
  const [includeTemplate, setIncludeTemplate] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    void api<BugTemplate[]>("/auth/bug-templates", { signal: abort.signal })
      .then((items) => {
        if (!abort.signal.aborted) setTemplates(items);
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setTemplateError("No se pudieron cargar las plantillas. Puedes continuar sin plantilla.");
      })
      .finally(() => {
        if (!abort.signal.aborted) setTemplatesLoading(false);
      });
    return () => abort.abort();
  }, []);

  const selectedTemplate = templates.find(({ id }) => id === templateId);
  const templateText = selectedTemplate?.description.trim() ?? "";
  const locked = busy || proposing;

  function showPreview(fields: Omit<BugDraft, "id" | "tagIds">) {
    setPreview({
      ...fields,
      id: crypto.randomUUID(),
      ...availableTemplateDefaults(
        defaults.find((item) => item.templateId === fields.templateId),
        tags,
        members,
      ),
    });
    setReviewed(false);
    setSavedId("");
  }

  async function propose() {
    if (!canProposeWithGemini || locked || proposalRequest.current) return;
    const description = source.trim();
    const controller = new AbortController();
    proposalRequest.current = controller;
    setConfirmGemini(false);
    setProposing(true);
    setError("");
    setMessage("");
    try {
      const proposal = await api<BugProposal>("/ai/bug-proposals", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          projectId,
          consent: true,
          description,
          ...(includeTemplate && templateText && { templateText }),
        }),
      });
      if (controller.signal.aborted) return;
      showPreview({ ...proposal, source: description, templateId: selectedTemplate?.id ?? "" });
      setMessage("Propuesta de Gemini lista para revisar.");
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "No se pudo generar la propuesta.");
    } finally {
      if (!controller.signal.aborted) setProposing(false);
      proposalRequest.current = null;
    }
  }

  function edit(patch: Partial<BugDraft>) {
    setPreview((current) => (current ? { ...current, ...patch } : null));
    setReviewed(false);
    setMessage("");
  }
  async function persist(next: BugDraft[]) {
    const saved = await withStorageLock(bugDraftsKey(userId, projectId), () =>
      saveBugDraftDocument(userId, projectId, next, revision),
    );
    setDrafts(saved.drafts);
    setRevision(saved.revision);
  }
  async function updateDrafts(next: BugDraft[], success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await persist(next);
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar los borradores.");
    } finally {
      setBusy(false);
    }
  }
  function reloadDrafts() {
    try {
      const next = loadBugDraftDocument(userId, projectId);
      setDrafts(next.drafts);
      setRevision(next.revision);
      setError("");
    } catch {
      setError("No se pudieron leer los borradores.");
    }
  }
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === bugDraftsKey(userId, projectId))
        setError("Los borradores cambiaron en otra pestaña. Actualiza la lista antes de guardar.");
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [userId, projectId]);
  async function publish(confirmed = reviewed) {
    if (!preview || !confirmed || locked || savedId) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const validTags = new Set(tags.map(({ id }) => id));
      if (preview.tagIds.some((id) => !validTags.has(id)))
        throw new Error("Revisa los tags del borrador antes de guardar.");
      if (preview.assigneeUserId && !members.some(({ id }) => id === preview.assigneeUserId))
        throw new Error("Selecciona un responsable disponible o deja el bug sin asignar.");
      const saved = await createBug(
        {
          projectId,
          title: preview.title.trim(),
          description: preview.description,
          priority: preview.priority,
          tagIds: preview.tagIds,
          ...(preview.assigneeUserId ? { assigneeUserId: preview.assigneeUserId } : {}),
        },
        await bugDraftRequestKey(userId, projectId, preview.id),
      );
      if (!alive.current) return;
      setConfirmSave(false);
      setSavedId(saved.id);
      setMessage(`Bug ${saved.id} guardado en Bugs.`);
      onSaved(saved);
      try {
        if (drafts.some(({ id }) => id === preview.id))
          await persist(drafts.filter(({ id }) => id !== preview.id));
      } catch {
        setError(
          "El bug se creó, pero no se pudo retirar su borrador local. Elimínalo de la lista antes de volver a usarlo.",
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el bug.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bug-design" aria-label="Diseñar bugs">
      <Alert tone="info">
        {canProposeWithGemini
          ? "Puedes preparar un borrador local o pedir una propuesta a Gemini. Revisa el contenido antes de guardar."
          : "La preparación local combina el texto y la plantilla en un borrador editable."}
      </Alert>
      {initial.error && <Alert tone="error">{initial.error}</Alert>}
      {error && !confirmSave && <Alert tone="error">{error}</Alert>}
      {message && (
        <Alert tone="success">
          <span>{message}</span>
          {savedId && (
            <button type="button" className="workspace__secondary" onClick={onOpenBugs}>
              Ver en Bugs
            </button>
          )}
        </Alert>
      )}
      <div className="bug-design__layout">
        <div className="bug-design__card">
          <h2 className="typography__section">Describe el problema</h2>
          <p>
            Preparar otro bug reemplaza la vista previa. Guarda primero el borrador que quieras
            conservar.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (locked) return;
              setError("");
              setMessage("");
              try {
                showPreview(prepareBug(source, selectedTemplate));
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "No se pudo preparar el bug.");
              }
            }}
          >
            <label className="workspace__field">
              Problema observado
              <RichTextarea
                value={source}
                onChange={(event) => setSource(event.target.value)}
                maxLength={3500}
                required
                rows={6}
                disabled={locked}
              />
            </label>
            <label className="workspace__field">
              Plantilla de bug
              <select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                disabled={templatesLoading || defaultsLoading || locked}
              >
                <option value="">Sin plantilla</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            {templateError && <Alert tone="error">{templateError}</Alert>}
            <div className="bug-design__actions">
              <button
                className="button button-primary bug-design__primary"
                disabled={!source.trim() || locked}
                type="submit"
              >
                Preparar bug
              </button>
              {canProposeWithGemini && (
                <button
                  className="button button-secondary"
                  disabled={!source.trim() || locked || templatesLoading || defaultsLoading}
                  type="button"
                  onClick={() => {
                    setIncludeTemplate(false);
                    setConfirmGemini(true);
                  }}
                >
                  Proponer con Gemini
                </button>
              )}
            </div>
            {proposing && <p role="status">Generando propuesta con Gemini…</p>}
          </form>
          <h2 className="typography__section">Borradores guardados</h2>
          <button
            className="workspace__secondary"
            type="button"
            disabled={locked}
            onClick={reloadDrafts}
          >
            Actualizar lista de borradores
          </button>
          <p>
            Solo en este navegador, para tu usuario y este proyecto. No guardes credenciales ni
            datos sensibles.
          </p>
          {!drafts.length && <p>No hay borradores guardados.</p>}
          {drafts.map((draft) => (
            <div className="bug-design__draft" key={draft.id}>
              <strong>{draft.title || "Sin título"}</strong>
              <button
                className="workspace__secondary"
                type="button"
                disabled={locked}
                onClick={() => {
                  setPreview({ ...draft, tagIds: [...draft.tagIds] });
                  setSource(draft.source);
                  setTemplateId(
                    templates.some(({ id }) => id === draft.templateId) ? draft.templateId : "",
                  );
                  setReviewed(false);
                  setSavedId("");
                  setError("");
                  setMessage("");
                }}
              >
                Abrir borrador
              </button>
              <button
                className="workspace__danger"
                type="button"
                disabled={locked}
                aria-label={`Eliminar borrador ${draft.title}`}
                onClick={() => {
                  void updateDrafts(
                    drafts.filter(({ id }) => id !== draft.id),
                    "Borrador eliminado del navegador.",
                  );
                }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
        <div className="bug-design__card">
          <h2 className="typography__section">Revisa el bug</h2>
          {!preview ? (
            <p>Prepara un bug o abre un borrador para editarlo.</p>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (reviewed) void publish();
                else setConfirmSave(true);
              }}
            >
              <fieldset className="bug-design__editor" disabled={locked || Boolean(savedId)}>
                <label className="workspace__field">
                  Título del bug
                  <input
                    value={preview.title}
                    onChange={(event) => edit({ title: event.target.value })}
                    required
                    maxLength={200}
                  />
                </label>
                <label className="workspace__field">
                  Descripción del bug
                  <RichTextarea
                    value={preview.description}
                    onChange={(event) => edit({ description: event.target.value })}
                    maxLength={5000}
                    rows={12}
                  />
                </label>
                <label className="workspace__field">
                  Prioridad
                  <select
                    value={preview.priority}
                    onChange={(event) =>
                      edit({ priority: event.target.value as BugDraft["priority"] })
                    }
                  >
                    {["Crítica", "Alta", "Media", "Baja"].map((priority) => (
                      <option key={priority}>{priority}</option>
                    ))}
                  </select>
                </label>
                {memberError && <Alert tone="error">{memberError}</Alert>}
                <label className="workspace__field">
                  Responsable QA
                  <select
                    value={preview.assigneeUserId ?? ""}
                    onChange={(event) => edit({ assigneeUserId: event.target.value || null })}
                  >
                    <option value="">Sin asignar</option>
                    {preview.assigneeUserId &&
                      !members.some(({ id }) => id === preview.assigneeUserId) && (
                        <option value={preview.assigneeUserId}>Responsable no disponible</option>
                      )}
                    {members.map(({ id, name }) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <TagPicker
                  tags={tags}
                  error={tagError}
                  selectedIds={preview.tagIds}
                  onChange={(tagIds) => edit({ tagIds })}
                />
                {preview.tagIds.some((id) => !tags.some((tag) => tag.id === id)) && (
                  <Alert tone="warning">
                    El borrador incluye tags que aún no están disponibles. Espera a que carguen o
                    retíralos antes de guardar.
                    <button
                      className="workspace__secondary"
                      type="button"
                      onClick={() =>
                        edit({
                          tagIds: preview.tagIds.filter((id) => tags.some((tag) => tag.id === id)),
                        })
                      }
                    >
                      Retirar tags no disponibles
                    </button>
                  </Alert>
                )}
                <label className="workspace__check">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(event) => setReviewed(event.target.checked)}
                  />
                  Revisé el contenido y confirmo la creación del bug.
                </label>
                <div className="bug-design__actions">
                  <button
                    className="workspace__secondary"
                    type="button"
                    disabled={Boolean(initial.error)}
                    onClick={() => {
                      void updateDrafts(
                        [...drafts.filter(({ id }) => id !== preview.id), preview],
                        "Borrador guardado en este navegador.",
                      );
                    }}
                  >
                    Guardar borrador
                  </button>
                  <button
                    className="button button-primary bug-design__primary"
                    type="submit"
                    disabled={!preview.title.trim() || Boolean(tagError)}
                  >
                    Guardar en Bugs
                  </button>
                </div>
              </fieldset>
              <DesignEvidencePanel
                key={preview.id}
                projectId={projectId}
                targetId={savedId || undefined}
              />
              {busy && <p role="status">Guardando bug…</p>}
              {savedId && <p>Ya se creó {savedId}. Prepara otro bug para continuar.</p>}
            </form>
          )}
        </div>
      </div>
      {confirmGemini && (
        <Dialog confirmation title="Enviar texto a Gemini" onClose={() => setConfirmGemini(false)}>
          <p>
            Revisa el texto que se enviará a Google. Retira credenciales y datos sensibles antes de
            continuar.
          </p>
          <div className="layout__stack">
            <div>
              <strong>Problema observado</strong>
              <p className="bug-design__outbound">{source.trim()}</p>
            </div>
            {templateText && (
              <label className="workspace__check">
                <input
                  type="checkbox"
                  checked={includeTemplate}
                  disabled={templateText.length > 1500}
                  onChange={(event) => setIncludeTemplate(event.target.checked)}
                />
                {templateText.length > 1500
                  ? "La plantilla supera el límite de 1500 caracteres y se omitirá."
                  : "Incluir el texto de la plantilla"}
              </label>
            )}
            {includeTemplate && (
              <div>
                <strong>Texto de la plantilla</strong>
                <p className="bug-design__outbound">{templateText}</p>
              </div>
            )}
          </div>
          <div className="workspace__actions workspace__actions--confirmation">
            <button
              type="button"
              className="workspace__secondary"
              onClick={() => setConfirmGemini(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="button button-primary"
              disabled={!canProposeWithGemini}
              onClick={() => void propose()}
            >
              Enviar y generar propuesta
            </button>
          </div>
        </Dialog>
      )}
      {confirmSave && preview && (
        <Dialog
          confirmation
          title="Guardar bug en Bugs"
          onClose={() => {
            if (!busy) setConfirmSave(false);
          }}
        >
          <p>
            Confirma la creación de <strong>{preview.title}</strong> en este proyecto.
          </p>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="workspace__actions workspace__actions--confirmation">
            <button
              className="workspace__secondary"
              type="button"
              disabled={locked}
              onClick={() => setConfirmSave(false)}
            >
              Cancelar
            </button>
            <button
              className="button button-primary"
              type="button"
              disabled={locked}
              onClick={() => void publish(true)}
            >
              {busy ? "Guardando…" : "Confirmar y guardar"}
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
