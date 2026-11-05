import { useState, type FormEvent } from "react";
import Alert from "../Alert";
import { api } from "../api";
import type { GeminiSettingsStatus } from "../contracts/apiContracts";

const path = "/ai/settings";

export default function GeminiSettingsPanel({
  status,
  onStatusChange,
}: {
  status: GeminiSettingsStatus | null | undefined;
  onStatusChange: (status: GeminiSettingsStatus) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function update(method: "PUT" | "DELETE", key?: FormDataEntryValue | null) {
    if (!status || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await api<GeminiSettingsStatus>(path, {
        method,
        body: JSON.stringify({
          revision: status.revision,
          ...(method === "PUT" && { apiKey: key }),
        }),
      });
      onStatusChange(data);
      setMessage(
        method === "PUT" ? "Tu clave de Gemini se guardó." : "La clave de tu cuenta se eliminó.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la conexión.");
    } finally {
      setBusy(false);
    }
  }

  function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const key = new FormData(form).get("apiKey");
    form.reset();
    void update("PUT", key);
  }

  return (
    <>
      <div className="account-settings__heading">
        <h2 className="typography__section">Google Gemini</h2>
        <p>Conecta tu cuenta de Google AI Studio para usar el piloto de borradores de bugs.</p>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      {status === undefined && <p role="status">Consultando conexión…</p>}
      {status === null && <Alert tone="error">No se pudo consultar la conexión.</Alert>}
      {status && (
        <div className="layout__stack">
          <p role="status">
            {status.source === "account"
              ? "Conectado con la clave de tu cuenta"
              : status.source === "environment"
                ? "Conectado mediante configuración del servidor"
                : "Gemini está sin conectar"}
          </p>
          {status.visualAvailable ? (
            <form className="account-settings__form" onSubmit={connect} aria-busy={busy}>
              <label className="workspace__field">
                Clave de API de Google AI Studio
                <input
                  name="apiKey"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  minLength={20}
                  maxLength={256}
                  disabled={busy}
                  required
                />
              </label>
              <p className="workspace__notice">
                La clave se comprueba con Google y queda cifrada en el servidor para tu cuenta.
              </p>
              <div className="layout__actions">
                <button className="button button-primary" type="submit" disabled={busy}>
                  {status.revision ? "Reemplazar clave" : "Conectar Gemini"}
                </button>
                {status.revision && (
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => void update("DELETE")}
                  >
                    Desconectar Gemini
                  </button>
                )}
              </div>
              {busy && <p role="status">Actualizando conexión…</p>}
            </form>
          ) : (
            <Alert tone="info">
              El servidor debe habilitar el almacenamiento cifrado para conectar desde esta
              pantalla. La alternativa está en <code>backend/.env.ai.local</code>.
            </Alert>
          )}
        </div>
      )}
    </>
  );
}
