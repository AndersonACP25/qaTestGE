import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import App from "./App";
import { api, ApiError, setCsrfToken } from "./api";
import type { User, SessionState } from "./api";

export type Theme = "light" | "dark";
export function validateAccess(email: string, password: string, confirmation?: string): string {
  if (!email.trim() || !password.trim()) return "Completa el correo y la contraseña.";
  if (password.length > 128) return "La contraseña admite hasta 128 caracteres.";
  if (confirmation !== undefined && password.length < 12) return "Usa al menos 12 caracteres en la contraseña.";
  if (confirmation !== undefined && password !== confirmation) return "Las contraseñas no coinciden.";
  return "";
}
export function resolveTheme(saved: string | null, prefersDark: boolean): Theme {
  return saved === "light" || saved === "dark" ? saved : prefersDark ? "dark" : "light";
}
export default function Session() {
  const [user, setUser] = useState<User | null>(null);
  const [register, setRegister] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<Theme>(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("qatestge-theme"); } catch { /* Appearance storage is optional. */ }
    return resolveTheme(saved, window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("qatestge-theme", theme); } catch { /* Keep appearance in memory. */ }
  }, [theme]);
  useEffect(() => {
    const abort = new AbortController();
    void api<SessionState>("/auth/me", { signal: abort.signal }).then((session) => {
      if (!abort.signal.aborted) { setCsrfToken(session.csrfToken); setUser(session.user); }
    }).catch((cause: unknown) => {
      if (!abort.signal.aborted && !(cause instanceof ApiError && cause.status === 401)) setError(cause instanceof Error ? cause.message : "No se pudo comprobar la sesión.");
    }).finally(() => { if (!abort.signal.aborted) setChecking(false); });
    const expired = () => { setCsrfToken(""); setUser(null); };
    window.addEventListener("qa:unauthorized", expired);
    return () => { abort.abort(); window.removeEventListener("qa:unauthorized", expired); };
  }, []);
  const themeControl = <button className="session__theme" aria-pressed={theme === "dark"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀ Tema claro" : "☾ Tema oscuro"}</button>;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const validation = validateAccess(email, password, register ? String(data.get("confirmation") ?? "") : undefined);
    if (validation) { setError(validation); return; }
    setBusy(true); setError("");
    try {
      const session = await api<SessionState>(register ? "/auth/register" : "/auth/login", { method: "POST", body: JSON.stringify({ email, password, ...(register ? { name: String(data.get("name") ?? "").trim() } : {}) }) });
      form.reset(); setCsrfToken(session.csrfToken); setUser(session.user);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    try { await api<void>("/auth/logout", { method: "POST", body: "{}" }); setCsrfToken(""); setUser(null); setRegister(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cerrar la sesión. Intenta de nuevo."); }
    finally { setBusy(false); }
  }
  if (checking) return <main className="session"><p role="status">Comprobando tu sesión…</p>{themeControl}</main>;
  if (user) return <>{error && <div className="session__error-banner" role="alert">{error}</div>}<App key={user.id} user={user} onUserUpdated={setUser} onLogout={() => { if (!busy) void logout(); }} themeControl={themeControl} /></>;
  return <main className="session">
    <div className="session__toolbar">{themeControl}</div>
    <section className="session__card" aria-labelledby="session-title">
      <div className="session__brand">qaTest<span>GE</span></div>
      <p className="session__eyebrow">TU ESPACIO DE CALIDAD</p>
      <h1 id="session-title">{register ? "Crea tu cuenta" : "Inicia sesión"}</h1>
      <p className="session__intro">Organiza tus bugs, pruebas y evidencias en un solo lugar.</p>
      <div className="session__tabs" role="group" aria-label="Modo de acceso">
        <button disabled={busy} className={`session__tab${!register ? " session__tab--active" : ""}`} aria-pressed={!register} onClick={() => { setRegister(false); setError(""); }}>Inicio de sesión</button>
        <button disabled={busy} className={`session__tab${register ? " session__tab--active" : ""}`} aria-pressed={register} onClick={() => { setRegister(true); setError(""); }}>Registro</button>
      </div>
      <form key={String(register)} className="session__form" onSubmit={(event) => void submit(event)} aria-busy={busy}>
        {register && <label className="session__field">Nombre<input disabled={busy} name="name" autoComplete="name" maxLength={100} required /></label>}
        <label className="session__field">Correo electrónico<input disabled={busy} name="email" type="email" autoComplete="username" maxLength={254} placeholder="tu@correo.com" required /></label>
        <label className="session__field">Contraseña<input disabled={busy} name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 12 : undefined} maxLength={128} placeholder={register ? "Al menos 12 caracteres" : "Tu contraseña"} required /></label>
        {register && <label className="session__field">Confirmar contraseña<input disabled={busy} name="confirmation" type="password" autoComplete="new-password" maxLength={128} required /></label>}
        {error && <p className="session__error" role="alert">{error}</p>}
        <button disabled={busy} className="session__submit" type="submit">{busy ? "Conectando…" : register ? "Crear cuenta y entrar →" : "Entrar al workspace →"}</button>
      </form>
      <p className="session__notice">{register ? "Tu cuenta tendrá un espacio y un proyecto propios. El acceso a otros espacios requiere una membresía explícita." : "Acceso con tu correo y contraseña. La sesión permanece activa al recargar y se revoca al salir."}</p>
    </section>
    <p className="session__footer">qaTestGE · Calidad en cada entrega</p>
  </main>;
}
