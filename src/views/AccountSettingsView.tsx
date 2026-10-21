import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import type { User } from "../api";

export default function AccountSettingsView({ user, onUserUpdated }: { user: User; onUserUpdated: (user: User) => void }) {
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

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true); setProfileError(""); setProfileMessage("");
    try {
      const updated = await api<User>("/auth/me", { method: "PATCH", body: JSON.stringify({ name: name.trim(), email: email.trim() }) });
      onUserUpdated(updated);
      setName(updated.name); setEmail(updated.email);
      setProfileMessage("Los datos de tu cuenta se actualizaron.");
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "No se pudo actualizar la cuenta.");
    } finally { setProfileBusy(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(""); setPasswordMessage("");
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
      await api<void>("/auth/password", { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      setPasswordMessage("La contraseña se actualizó. Se cerraron las demás sesiones de esta cuenta.");
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña.");
    } finally { setPasswordBusy(false); }
  }

  return <div className="account-settings">
    <section className="account-settings__card">
      <div className="account-settings__heading"><h2>Información de la cuenta</h2><p>Actualiza el nombre y correo asociados a tu usuario.</p></div>
      <form className="account-settings__form" onSubmit={(event) => void saveProfile(event)} aria-busy={profileBusy}>
        <label className="workspace__field">Nombre<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={100} required /></label>
        <label className="workspace__field">Correo electrónico<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={254} required /></label>
        {profileError && <p className="workspace__error" role="alert">{profileError}</p>}
        {profileMessage && <p className="account-settings__success" role="status">{profileMessage}</p>}
        <div className="workspace__actions"><button className="button button-primary" type="submit" disabled={profileBusy}>{profileBusy ? "Guardando…" : "Guardar cambios"}</button></div>
      </form>
    </section>
    <section className="account-settings__card">
      <div className="account-settings__heading"><h2>Seguridad</h2><p>Elige una contraseña nueva de al menos 12 caracteres. Las demás sesiones se revocarán.</p></div>
      <form className="account-settings__form" onSubmit={(event) => void changePassword(event)} aria-busy={passwordBusy}>
        <label className="workspace__field">Contraseña actual<input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" autoComplete="current-password" maxLength={128} required /></label>
        <label className="workspace__field">Nueva contraseña<input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
        <label className="workspace__field">Confirmar nueva contraseña<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} type="password" autoComplete="new-password" maxLength={128} required /></label>
        {passwordError && <p className="workspace__error" role="alert">{passwordError}</p>}
        {passwordMessage && <p className="account-settings__success" role="status">{passwordMessage}</p>}
        <div className="workspace__actions"><button className="button button-primary" type="submit" disabled={passwordBusy}>{passwordBusy ? "Actualizando…" : "Cambiar contraseña"}</button></div>
      </form>
    </section>
  </div>;
}
