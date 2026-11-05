import { useState, type FormEvent } from "react";
import Alert from "./Alert";
import { api } from "./api";

export default function AccountLinkForm({
  token,
  onBack,
  onCompleted,
}: {
  token: string | null;
  onBack: () => void;
  onCompleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    if (token !== null && (!password.trim() || password !== data.get("confirmation"))) {
      setError("Introduce una contraseña y confirma que ambas coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (token !== null) {
        await api("/auth/account-links/consume", {
          method: "POST",
          body: JSON.stringify({ token, password }),
        });
        onCompleted();
      } else {
        await api("/auth/account-links/request", {
          method: "POST",
          body: JSON.stringify({ email: data.get("email") }),
        });
        setAccepted(true);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo procesar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 id="session-title">{token !== null ? "Define tu contraseña" : "Recupera el acceso"}</h1>
      {accepted ? (
        <Alert tone="success">
          Si hay una cuenta disponible para ese correo, recibirás un enlace para acceder.
        </Alert>
      ) : (
        <form className="session__form" onSubmit={(event) => void submit(event)} aria-busy={busy}>
          {token !== null ? (
            <>
              <label className="session__field">
                Nueva contraseña
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  disabled={busy}
                />
              </label>
              <label className="session__field">
                Confirmar contraseña
                <input
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  disabled={busy}
                />
              </label>
            </>
          ) : (
            <label className="session__field">
              Correo electrónico
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                disabled={busy}
              />
            </label>
          )}
          {error && <Alert tone="error">{error}</Alert>}
          <button className="session__submit" disabled={busy} type="submit">
            {busy ? "Procesando…" : token !== null ? "Guardar contraseña" : "Solicitar enlace"}
          </button>
        </form>
      )}
      <button className="workspace__secondary" disabled={busy} onClick={onBack} type="button">
        Volver al acceso
      </button>
    </>
  );
}
