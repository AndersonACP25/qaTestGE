import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import App from "./App";

export type Theme = "light" | "dark";

export function validateDemoAccess(user: string, password: string, confirmation?: string): string {
  if (!user.trim() || !password.trim()) return "Completa el usuario y la contraseña.";
  if (confirmation !== undefined && password !== confirmation) return "Las contraseñas no coinciden.";
  return "";
}

export function resolveTheme(saved: string | null, prefersDark: boolean): Theme {
  return saved === "light" || saved === "dark" ? saved : prefersDark ? "dark" : "light";
}

export default function Session() {
  const [user, setUser] = useState("");
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<Theme>(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("qatestge-theme"); } catch { /* Storage is optional. */ }
    return resolveTheme(saved, window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("qatestge-theme", theme); } catch { /* Keep the theme in memory. */ }
  }, [theme]);

  const themeControl = <button className="session__theme" aria-pressed={theme === "dark"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
    {theme === "dark" ? "☀ Tema claro" : "☾ Tema oscuro"}
  </button>;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("user") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const validation = validateDemoAccess(name, password, register ? String(data.get("confirmation") ?? "") : undefined);
    if (validation) { setError(validation); return; }
    setError("");
    setUser(name);
  }

  if (user) return <App user={user} themeControl={themeControl} onLogout={() => { setUser(""); setRegister(false); setError(""); }} />;

  return <main className="session">
    <div className="session__toolbar">{themeControl}</div>
    <section className="session__card" aria-labelledby="session-title">
      <div className="session__brand">qaTest<span>GE</span></div>
      <p className="session__eyebrow">TU ESPACIO DE CALIDAD</p>
      <h1 id="session-title">{register ? "Crea tu cuenta" : "Inicia sesión"}</h1>
      <p className="session__intro">Organiza tus bugs, pruebas y evidencias en un solo lugar.</p>
      <div className="session__tabs" role="group" aria-label="Modo de acceso">
        <button className={`session__tab${!register ? " session__tab--active" : ""}`} aria-pressed={!register} onClick={() => { setRegister(false); setError(""); }}>Inicio de sesión</button>
        <button className={`session__tab${register ? " session__tab--active" : ""}`} aria-pressed={register} onClick={() => { setRegister(true); setError(""); }}>Registro</button>
      </div>
      <form key={String(register)} className="session__form" onSubmit={submit}>
        <label className="session__field">Usuario<input name="user" autoComplete="username" placeholder="Tu nombre o correo" required /></label>
        <label className="session__field">Contraseña<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} placeholder="Cualquier contraseña de prueba" required /></label>
        {register && <label className="session__field">Confirmar contraseña<input name="confirmation" type="password" autoComplete="new-password" placeholder="Confirma tu contraseña" required /></label>}
        {error && <p className="session__error" role="alert">{error}</p>}
        <button className="session__submit" type="submit">{register ? "Registrarme y entrar" : "Entrar al workspace"} →</button>
      </form>
      <p className="session__notice">Demo local: acepta cualquier usuario y contraseña no vacíos. El registro es simulado; no se crean cuentas ni se guardan o envían credenciales. Usa datos de prueba. Al recargar, vuelve a iniciar sesión.</p>
    </section>
    <p className="session__footer">qaTestGE · Calidad en cada entrega</p>
  </main>;
}
