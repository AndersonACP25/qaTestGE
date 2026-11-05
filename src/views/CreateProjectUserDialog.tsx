import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Dialog from "../Dialog";
import Alert from "../Alert";
import { provisionUserSchema } from "../../backend/src/models/audit.model";
import {
  projectRoles,
  type ProjectMember,
  type ProjectRole,
} from "../../backend/src/models/collaboration.model";
export default function CreateProjectUserDialog({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: (member: ProjectMember, activation: boolean) => void;
}) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [linksEnabled, setLinksEnabled] = useState(false);
  const [activation, setActivation] = useState(false);
  const [role, setRole] = useState<ProjectRole>("QA");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const pending = useRef<{ key: string; body: string } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const abort = new AbortController();
    void api<{ enabled: boolean }>("/auth/account-links", { signal: abort.signal })
      .then(({ enabled }) => {
        if (!abort.signal.aborted) setLinksEnabled(enabled);
      })
      .catch(() => {
        /* La capacidad es opcional. */
      });
    return () => {
      alive.current = false;
      abort.abort();
    };
  }, []);
  return (
    <Dialog
      title="Crear usuario del proyecto"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="project-user__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          const parsed = provisionUserSchema.safeParse({
            name,
            email,
            ...(activation ? {} : { password }),
            role,
          });
          if (!parsed.success) {
            setError("Revisa nombre, correo, contraseña de 12 a 128 caracteres y rol.");
            return;
          }
          if (!pending.current)
            pending.current = { key: crypto.randomUUID(), body: JSON.stringify(parsed.data) };
          setAttempted(true);
          setBusy(true);
          setError("");
          void api<ProjectMember>(`/project-users?projectId=${encodeURIComponent(projectId)}`, {
            method: "POST",
            headers: { "Idempotency-Key": pending.current.key },
            body: pending.current.body,
          })
            .then((member) => {
              if (alive.current) {
                setPassword("");
                onCreated(member, activation);
              }
            })
            .catch((cause: unknown) => {
              if (alive.current)
                setError(cause instanceof Error ? cause.message : "No se pudo crear el usuario.");
            })
            .finally(() => {
              if (alive.current) setBusy(false);
            });
        }}
      >
        <p>
          Crea una cuenta nueva con acceso únicamente a este proyecto. El rol controla sus permisos;
          no concede administración del equipo.
        </p>
        <fieldset className="permissions__group" disabled={busy || attempted}>
          <label className="workspace__field">
            Nombre del nuevo usuario
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              autoComplete="off"
            />
          </label>
          <label className="workspace__field">
            Correo del nuevo usuario
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
              autoComplete="off"
            />
          </label>
          {linksEnabled && (
            <label className="project-user__activation">
              <input
                type="checkbox"
                checked={activation}
                onChange={(event) => setActivation(event.target.checked)}
              />
              Enviar enlace de activación
            </label>
          )}
          {!activation && (
            <label className="workspace__field">
              Contraseña inicial
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
          )}
          <label className="workspace__field">
            Rol del nuevo usuario
            <select
              value={role}
              onChange={(e) => {
                const selected = projectRoles.find((value) => value === e.target.value);
                if (selected) setRole(selected);
              }}
            >
              {projectRoles.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </fieldset>
        <p className="typography__caption">
          {activation
            ? "La persona recibirá un enlace de un solo uso para definir su contraseña."
            : "La persona podrá iniciar sesión con ese correo y contraseña."}
        </p>
        {error && <Alert tone="error">{error}</Alert>}
        {attempted && error && (
          <p>
            Reintentar conserva los mismos datos. Antes de iniciar otro intento, revisa si el
            usuario ya aparece en la lista.
          </p>
        )}
        <div className="workspace__actions">
          <button className="workspace__secondary" type="button" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? "Creando…" : attempted ? "Reintentar creación" : "Crear usuario"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
