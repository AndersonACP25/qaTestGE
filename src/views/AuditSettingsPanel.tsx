import { useEffect, useRef, useState } from "react";
import Alert from "../Alert";
import { api } from "../api";
import { usePermissions } from "../controllers/ProjectPermissions";
import {
  auditProfiles,
  auditSettingsSchema,
  type AuditSettings,
} from "../../backend/src/models/audit.model";
export default function AuditSettingsPanel({
  projectId,
  value,
  onSaved,
}: {
  projectId: string;
  value: AuditSettings;
  onSaved: (value: AuditSettings) => void;
}) {
  const allowed = usePermissions().can("settings.manage");
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const alive = useRef(true),
    locked = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <details className="audit-settings layout__inset">
      <summary>Configuración de auditoría · {value.profile}</summary>
      <div className="audit-settings__description layout__stack">
        <dl>
          <div>
            <dt>General</dt>
            <dd>Incluye todos los eventos del proyecto.</dd>
          </div>
          <div>
            <dt>Calidad</dt>
            <dd>Se centra en los recursos de prueba y su trazabilidad.</dd>
          </div>
          <div>
            <dt>Seguridad</dt>
            <dd>Reúne accesos, altas y cambios de configuración.</dd>
          </div>
        </dl>
        <p className="typography__caption">
          Los filtros y el nivel de detalle conservan los eventos del historial.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!allowed || locked.current) return;
          locked.current = true;
          setBusy(true);
          setError("");
          setMessage("");
          void api<AuditSettings>(`/audit-settings?projectId=${encodeURIComponent(projectId)}`, {
            method: "PUT",
            body: JSON.stringify(draft),
          })
            .then((saved) => {
              if (alive.current) {
                setDraft(saved);
                onSaved(saved);
                setMessage("Configuración de auditoría guardada.");
              }
            })
            .catch((cause: unknown) => {
              if (alive.current)
                setError(
                  cause instanceof Error ? cause.message : "No se pudo guardar la configuración.",
                );
            })
            .finally(() => {
              locked.current = false;
              if (alive.current) setBusy(false);
            });
        }}
      >
        <fieldset className="audit-settings__fields permissions__group" disabled={!allowed || busy}>
          <label className="workspace__field">
            Perfil predeterminado
            <select
              value={draft.profile}
              onChange={(e) => {
                const profile = auditProfiles.find((v) => v === e.target.value);
                if (profile) setDraft({ ...draft, profile });
              }}
            >
              {auditProfiles.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="workspace__field">
            Detalle del historial
            <select
              value={draft.detail}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  detail: e.target.value === "Resumen" ? "Resumen" : "Detallado",
                })
              }
            >
              <option>Resumen</option>
              <option>Detallado</option>
            </select>
          </label>
          <label className="workspace__field">
            Eventos por página
            <select
              value={draft.pageSize}
              onChange={(e) => {
                const parsed = auditSettingsSchema.safeParse({
                  ...draft,
                  pageSize: Number(e.target.value),
                });
                if (parsed.success) setDraft(parsed.data);
              }}
            >
              {[25, 50, 100].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          {allowed && (
            <button className="button button-primary" disabled={busy}>
              {busy ? "Guardando…" : "Guardar configuración de auditoría"}
            </button>
          )}
        </fieldset>
      </form>
      <button
        type="button"
        className="workspace__secondary"
        disabled={busy}
        onClick={() => {
          if (locked.current) return;
          locked.current = true;
          setBusy(true);
          setError("");
          setMessage("");
          void api<AuditSettings>(`/audit-settings?projectId=${encodeURIComponent(projectId)}`)
            .then((saved) => {
              if (alive.current) {
                setDraft(saved);
                onSaved(saved);
                setMessage("Configuración de auditoría actualizada.");
              }
            })
            .catch((cause: unknown) => {
              if (alive.current)
                setError(
                  cause instanceof Error ? cause.message : "No se pudo cargar la configuración.",
                );
            })
            .finally(() => {
              locked.current = false;
              if (alive.current) setBusy(false);
            });
        }}
      >
        Actualizar configuración de auditoría
      </button>
      {!allowed && (
        <p className="typography__caption">
          Solo Admin puede cambiar la configuración del proyecto.
        </p>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
    </details>
  );
}
