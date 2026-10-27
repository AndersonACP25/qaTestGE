import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Alert from "../Alert";
import { api } from "../api";
import type { BugTemplate, BugTemplateInput, BugTemplatePriority, User } from "../api";
import { categories, maxCaseCount } from "../models/caseDesign.model";
import type { CaseCountDefaults } from "../models/caseCountDefaults";

const priorities: BugTemplatePriority[] = ["Crítica", "Alta", "Media", "Baja"];
const emptyTemplate: BugTemplateInput = { name: "", title: "", description: "", priority: "Media" };

export default function AccountSettingsView({
  user,
  onUserUpdated,
  onAccountDeleted,
  caseCountDefaults,
  onCaseCountDefaultsChanged,
  selectedCategories,
  onSelectedCategoriesChanged,
}: {
  user: User;
  onUserUpdated: (user: User) => void;
  onAccountDeleted: () => void;
  caseCountDefaults: CaseCountDefaults;
  onCaseCountDefaultsChanged: (defaults: CaseCountDefaults) => void;
  selectedCategories: string[];
  onSelectedCategoriesChanged: (categories: string[]) => void;
}) {
  const [section, setSection] = useState<"cuenta" | "plantillas" | "diseno" | "ia">("cuenta");
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [templates, setTemplates] = useState<BugTemplate[]>([]);
  const [templatesBusy, setTemplatesBusy] = useState(true);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [templateMessage, setTemplateMessage] = useState("");
  const [templateForm, setTemplateForm] = useState<BugTemplateInput>(emptyTemplate);
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [countDefaults, setCountDefaults] = useState(caseCountDefaults);
  const [selectedDefaults, setSelectedDefaults] = useState(selectedCategories);
  const [countDefaultsBusy, setCountDefaultsBusy] = useState(false);
  const [countDefaultsError, setCountDefaultsError] = useState("");
  const [countDefaultsMessage, setCountDefaultsMessage] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    void api<BugTemplate[]>("/auth/bug-templates", { signal: abort.signal })
      .then(setTemplates)
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setTemplateError(
            cause instanceof Error ? cause.message : "No se pudieron cargar las plantillas.",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setTemplatesBusy(false);
      });
    return () => abort.abort();
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const updated = await api<User>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      onUserUpdated(updated);
      setName(updated.name);
      setEmail(updated.email);
      setProfileMessage("Los datos de tu cuenta se actualizaron.");
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "No se pudo actualizar la cuenta.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (newPassword.length < 12 || newPassword.length > 128) {
      setPasswordError("La nueva contraseña debe tener entre 12 y 128 caracteres.");
      return;
    }
    if (newPassword !== confirmation) {
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setPasswordBusy(true);
    try {
      await api<void>("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setPasswordMessage(
        "La contraseña se actualizó. Se cerraron las demás sesiones de esta cuenta.",
      );
    } catch (cause) {
      setPasswordError(
        cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña.",
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  function editTemplate(template: BugTemplate) {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      title: template.title,
      description: template.description,
      priority: template.priority,
    });
    setTemplateError("");
    setTemplateMessage("");
  }

  function resetTemplateForm() {
    setEditingTemplateId("");
    setTemplateForm(emptyTemplate);
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTemplateBusy(true);
    setTemplateError("");
    setTemplateMessage("");
    try {
      const path = editingTemplateId
        ? `/auth/bug-templates/${encodeURIComponent(editingTemplateId)}`
        : "/auth/bug-templates";
      const saved = await api<BugTemplate>(path, {
        method: editingTemplateId ? "PATCH" : "POST",
        body: JSON.stringify({
          ...templateForm,
          name: templateForm.name.trim(),
          title: templateForm.title.trim(),
        }),
      });
      setTemplates((current) =>
        editingTemplateId
          ? current.map((template) => (template.id === saved.id ? saved : template))
          : [...current, saved],
      );
      resetTemplateForm();
      setTemplateMessage("La plantilla se guardó en tu cuenta.");
    } catch (cause) {
      setTemplateError(cause instanceof Error ? cause.message : "No se pudo guardar la plantilla.");
    } finally {
      setTemplateBusy(false);
    }
  }

  async function removeTemplate(template: BugTemplate) {
    setTemplateBusy(true);
    setTemplateError("");
    setTemplateMessage("");
    try {
      await api<void>(`/auth/bug-templates/${encodeURIComponent(template.id)}`, {
        method: "DELETE",
      });
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      if (editingTemplateId === template.id) resetTemplateForm();
      setTemplateMessage(`Se eliminó la plantilla «${template.name}».`);
    } catch (cause) {
      setTemplateError(
        cause instanceof Error ? cause.message : "No se pudo eliminar la plantilla.",
      );
    } finally {
      setTemplateBusy(false);
    }
  }

  async function deactivateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleteError("");
    if (deleteConfirmation !== "ELIMINAR CUENTA") {
      setDeleteError("Escribe ELIMINAR CUENTA para confirmar.");
      return;
    }
    setDeleteBusy(true);
    try {
      await api<void>("/auth/me", {
        method: "DELETE",
        body: JSON.stringify({ currentPassword: deletePassword, confirmation: deleteConfirmation }),
      });
      onAccountDeleted();
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "No se pudo desactivar la cuenta.");
    } finally {
      setDeleteBusy(false);
    }
  }

  function saveCountDefaults(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCountDefaultsBusy(true);
    setCountDefaultsError("");
    setCountDefaultsMessage("");
    try {
      onCaseCountDefaultsChanged(countDefaults);
      onSelectedCategoriesChanged(selectedDefaults);
      setCountDefaultsMessage("Las preferencias de diseño se guardaron en este navegador.");
    } catch (cause) {
      setCountDefaultsError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron guardar los valores predeterminados.",
      );
    } finally {
      setCountDefaultsBusy(false);
    }
  }

  return (
    <div className="account-settings">
      <nav className="account-settings__navigation" aria-label="Apartados de configuración">
        {(
          [
            ["cuenta", "Cuenta y seguridad"],
            ["plantillas", "Plantillas de bugs"],
            ["diseno", "Diseño de casos"],
            ["ia", "Inteligencia artificial"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="button"
            aria-pressed={section === id}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <section className="account-settings__card" hidden={section !== "cuenta"}>
        <div className="account-settings__heading">
          <h2>Información de la cuenta</h2>
          <p>Actualiza el nombre y correo asociados a tu usuario.</p>
        </div>
        <form
          className="account-settings__form"
          onSubmit={(event) => void saveProfile(event)}
          aria-busy={profileBusy}
        >
          <label className="workspace__field">
            Nombre
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={100}
              required
            />
          </label>
          <label className="workspace__field">
            Correo electrónico
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          {profileError && <Alert tone="error">{profileError}</Alert>}
          {profileMessage && <Alert tone="success">{profileMessage}</Alert>}
          <div className="workspace__actions">
            <button className="button button-primary" type="submit" disabled={profileBusy}>
              {profileBusy ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>
      <section className="account-settings__card" hidden={section !== "cuenta"}>
        <div className="account-settings__heading">
          <h2>Seguridad</h2>
          <p>
            Elige una contraseña nueva de al menos 12 caracteres. Las demás sesiones se revocarán.
          </p>
        </div>
        <form
          className="account-settings__form"
          onSubmit={(event) => void changePassword(event)}
          aria-busy={passwordBusy}
        >
          <label className="workspace__field">
            Contraseña actual
            <input
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </label>
          <label className="workspace__field">
            Nueva contraseña
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <label className="workspace__field">
            Confirmar nueva contraseña
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              type="password"
              autoComplete="new-password"
              maxLength={128}
              required
            />
          </label>
          {passwordError && <Alert tone="error">{passwordError}</Alert>}
          {passwordMessage && <Alert tone="success">{passwordMessage}</Alert>}
          <div className="workspace__actions">
            <button className="button button-primary" type="submit" disabled={passwordBusy}>
              {passwordBusy ? "Actualizando…" : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </section>
      <section
        className="account-settings__card account-settings__card--wide"
        hidden={section !== "plantillas"}
      >
        <div className="account-settings__heading">
          <h2>Plantillas para bugs</h2>
          <p>
            Crea formatos personales inspirados en GitHub Issue Templates. El contenido se guarda
            como texto y nunca se interpreta como HTML.
          </p>
        </div>
        <form
          className="account-settings__form"
          onSubmit={(event) => void saveTemplate(event)}
          aria-busy={templateBusy}
        >
          <label className="workspace__field">
            Nombre de la plantilla
            <input
              value={templateForm.name}
              onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })}
              maxLength={100}
              required
              placeholder="Ej. Error funcional"
            />
          </label>
          <label className="workspace__field">
            Título sugerido
            <input
              value={templateForm.title}
              onChange={(event) => setTemplateForm({ ...templateForm, title: event.target.value })}
              maxLength={200}
              placeholder="Ej. [Bug] "
            />
          </label>
          <label className="workspace__field">
            Descripción / secciones
            <textarea
              value={templateForm.description}
              onChange={(event) =>
                setTemplateForm({ ...templateForm, description: event.target.value })
              }
              maxLength={5000}
              rows={5}
              placeholder={
                "## Pasos para reproducir\n\n## Comportamiento esperado\n\n## Comportamiento actual"
              }
            />
          </label>
          <label className="workspace__field">
            Prioridad predeterminada
            <select
              value={templateForm.priority}
              onChange={(event) =>
                setTemplateForm({
                  ...templateForm,
                  priority: event.target.value as BugTemplatePriority,
                })
              }
            >
              {priorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </label>
          {templateError && <Alert tone="error">{templateError}</Alert>}
          {templateMessage && <Alert tone="success">{templateMessage}</Alert>}
          <div className="workspace__actions">
            <button
              className="button button-primary"
              type="submit"
              disabled={templateBusy || templatesBusy}
            >
              {templateBusy
                ? "Guardando…"
                : editingTemplateId
                  ? "Actualizar plantilla"
                  : "Guardar plantilla"}
            </button>
            {editingTemplateId && (
              <button
                className="workspace__secondary"
                type="button"
                disabled={templateBusy}
                onClick={resetTemplateForm}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
        <div className="account-settings__templates" aria-live="polite">
          {templatesBusy ? (
            <p className="workspace__notice">Cargando plantillas…</p>
          ) : templates.length === 0 ? (
            <p className="workspace__notice">
              Todavía no tienes plantillas. Las plantillas creadas aquí aparecerán en el formulario
              «Nuevo bug».
            </p>
          ) : (
            templates.map((template) => (
              <article className="account-settings__template" key={template.id}>
                <div>
                  <strong>{template.name}</strong>
                  <p>
                    {template.title || "Sin título sugerido"} · Prioridad {template.priority}
                  </p>
                </div>
                <div className="account-settings__template-actions">
                  <button
                    className="workspace__secondary"
                    type="button"
                    disabled={templateBusy}
                    onClick={() => editTemplate(template)}
                  >
                    Editar
                  </button>
                  <button
                    className="workspace__secondary"
                    type="button"
                    disabled={templateBusy}
                    onClick={() => void removeTemplate(template)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      <section className="account-settings__card" hidden={section !== "diseno"}>
        <div className="account-settings__heading">
          <h2>Diseño de test cases</h2>
          <p>
            Define qué tipos de prueba y cuántos ejemplos aparecerán seleccionados inicialmente. Los
            valores se guardan en este navegador y puedes cambiarlos antes de mostrar la vista
            previa.
          </p>
        </div>
        <form
          className="account-settings__form"
          onSubmit={saveCountDefaults}
          aria-busy={countDefaultsBusy}
        >
          <h3>Tipos seleccionados inicialmente</h3>
          <p className="workspace__notice">
            Mantén al menos un tipo seleccionado para iniciar el diseño.
          </p>
          <div className="account-settings__count-grid">
            {categories.map((category) => (
              <div className="account-settings__count-item" key={category.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedDefaults.includes(category.id)}
                    onChange={(event) =>
                      setSelectedDefaults((current) =>
                        event.target.checked
                          ? [...current, category.id]
                          : current.filter((id) => id !== category.id),
                      )
                    }
                  />
                  <span>{category.label}</span>
                </label>
                <select
                  aria-label={`Valor inicial para ${category.label}`}
                  value={countDefaults[category.id] ?? 1}
                  onChange={(event) =>
                    setCountDefaults((current) => ({
                      ...current,
                      [category.id]: Number(event.target.value),
                    }))
                  }
                >
                  {Array.from({ length: maxCaseCount }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {countDefaultsError && <Alert tone="error">{countDefaultsError}</Alert>}
          {countDefaultsMessage && <Alert tone="success">{countDefaultsMessage}</Alert>}
          <div className="workspace__actions">
            <button className="button button-primary" type="submit" disabled={countDefaultsBusy}>
              {countDefaultsBusy ? "Guardando…" : "Guardar valores predeterminados"}
            </button>
          </div>
        </form>
      </section>
      <section className="account-settings__card" hidden={section !== "ia"}>
        <div className="account-settings__heading">
          <h2>Conexión con IA</h2>
          <p>
            Vista preliminar de una futura configuración de proveedores. Esta sección es solo una
            maqueta.
          </p>
        </div>
        <div className="account-settings__mock">
          <label className="workspace__field">
            Proveedor
            <select disabled value="">
              <option value="">Sin conectar</option>
              <option>OpenAI</option>
              <option>Anthropic</option>
              <option>Proveedor compatible</option>
            </select>
          </label>
          <label className="workspace__field">
            Clave del proveedor
            <input type="password" disabled placeholder="No disponible en esta versión" />
          </label>
          <button className="button button-primary" type="button" disabled>
            Conectar proveedor (próximamente)
          </button>
          <p className="workspace__notice">
            No se almacenan credenciales ni se envían datos a proveedores de IA.
          </p>
        </div>
      </section>
      <section
        className="account-settings__card account-settings__card--danger"
        hidden={section !== "cuenta"}
      >
        <div className="account-settings__heading">
          <h2>Zona de peligro · Desactivar cuenta</h2>
          <p>
            Tu acceso se desactivará y tu nombre, correo y contraseña se anonimizarán. Se revocarán
            todas las sesiones y se eliminarán tus plantillas. Los proyectos, membresías y registros
            de QA se conservarán para no romper su trazabilidad.
          </p>
        </div>
        <form
          className="account-settings__form"
          onSubmit={(event) => void deactivateAccount(event)}
          aria-busy={deleteBusy}
        >
          <label className="workspace__field">
            Contraseña actual
            <input
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </label>
          <label className="workspace__field">
            Escribe ELIMINAR CUENTA para confirmar
            <input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              autoComplete="off"
              required
            />
          </label>
          {deleteError && <Alert tone="error">{deleteError}</Alert>}
          <div className="workspace__actions">
            <button
              className="account-settings__delete-button"
              type="submit"
              disabled={deleteBusy || deleteConfirmation !== "ELIMINAR CUENTA"}
            >
              {deleteBusy ? "Desactivando…" : "Desactivar y anonimizar cuenta"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
