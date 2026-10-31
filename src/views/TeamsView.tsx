import { useEffect, useState, type FormEvent } from "react";
import Alert from "../Alert";
import { api } from "../api";

type Team = { id: string; name: string; role: "owner" | "member" };
type Member = { id: string; name: string; role: "owner" | "member" };

export default function TeamsView({ onChanged }: { onChanged: () => void }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [code, setCode] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState<Member | null>(null);
  const [teamName, setTeamName] = useState("");
  const [editingTeam, setEditingTeam] = useState(false);
  const [deleteTeam, setDeleteTeam] = useState(false);
  const team = teams.find((item) => item.id === selected);
  useEffect(() => {
    const abort = new AbortController();
    void api<Team[]>("/teams", { signal: abort.signal })
      .then((items) => {
        setTeams(items);
        setSelected((id) => (items.some((item) => item.id === id) ? id : (items[0]?.id ?? "")));
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los equipos.");
      });
    return () => abort.abort();
  }, [revision]);
  useEffect(() => {
    if (!selected) {
      setMembers([]);
      return;
    }
    const abort = new AbortController();
    void api<Member[]>(`/teams/${encodeURIComponent(selected)}/members`, { signal: abort.signal })
      .then(setMembers)
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "No se pudieron cargar los integrantes.",
          );
      });
    return () => abort.abort();
  }, [selected, revision]);
  async function act(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la operación.");
    } finally {
      setBusy(false);
    }
  }
  function refresh() {
    setRevision((n) => n + 1);
    onChanged();
  }
  async function accept(event: FormEvent) {
    event.preventDefault();
    await act(async () => {
      await api("/team-invitations/accept", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      setCode("");
      setMessage("Te uniste al equipo.");
      refresh();
    });
  }
  return (
    <div className="projects-view">
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <section className="projects-view__panel">
        <h2 className="typography__section">{editingTeam ? "Editar equipo" : "Crear equipo"}</h2>
        <form
          className="projects-view__form"
          onSubmit={(event) => {
            event.preventDefault();
            void act(async () => {
              if (editingTeam)
                await api(`/teams/${encodeURIComponent(selected)}`, {
                  method: "PATCH",
                  body: JSON.stringify({ name: teamName }),
                });
              else {
                const created = await api<Team>("/teams", {
                  method: "POST",
                  body: JSON.stringify({ name: teamName }),
                });
                setSelected(created.id);
              }
              setMessage(editingTeam ? "Equipo actualizado." : "Equipo creado.");
              setTeamName("");
              setEditingTeam(false);
              refresh();
            });
          }}
        >
          <label className="workspace__field">
            Nombre del equipo
            <input
              required
              maxLength={100}
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
            />
          </label>
          <div className="projects-view__actions">
            <button className="button button-primary" disabled={busy} type="submit">
              {editingTeam ? "Guardar equipo" : "Crear equipo"}
            </button>
            {editingTeam && (
              <button
                type="button"
                className="workspace__secondary"
                disabled={busy}
                onClick={() => {
                  setEditingTeam(false);
                  setTeamName("");
                }}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </section>
      <section className="projects-view__panel">
        <h2 className="typography__section">Unirse a un equipo</h2>
        <p>
          Solicita al propietario un código de un solo uso. Al aceptarlo formarás parte del equipo;
          un Admin deberá asignarte acceso a cada proyecto.
        </p>
        <form className="projects-view__form" onSubmit={(event) => void accept(event)}>
          <label className="workspace__field">
            Código de invitación
            <input
              autoComplete="off"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              minLength={64}
              maxLength={64}
            />
          </label>
          <button className="button button-primary" disabled={busy} type="submit">
            Aceptar invitación
          </button>
        </form>
      </section>
      <section className="projects-view__panel">
        <h2 className="typography__section">Mis equipos</h2>
        <label className="workspace__field">
          Equipo
          <select
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setInvite(null);
              setRemoving(null);
              setDeleteTeam(false);
              setEditingTeam(false);
              setTeamName("");
            }}
          >
            {teams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.role === "owner" ? "Propietario" : "Integrante"}
              </option>
            ))}
          </select>
        </label>
        {team?.role === "owner" && (
          <>
            <div className="projects-view__actions">
              <button
                type="button"
                className="workspace__secondary"
                disabled={busy}
                onClick={() => {
                  setEditingTeam(true);
                  setTeamName(team.name);
                }}
              >
                Editar equipo
              </button>
              <button
                type="button"
                className="workspace__danger"
                disabled={busy}
                onClick={() => setDeleteTeam(true)}
              >
                Eliminar equipo
              </button>
            </div>
            {deleteTeam && (
              <div className="projects-view__delete-confirmation">
                <p>
                  Solo puedes eliminar un equipo sin proyectos ni otros integrantes. Los códigos
                  pendientes quedarán anulados.
                </p>
                <button
                  type="button"
                  className="workspace__danger"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      await api(`/teams/${encodeURIComponent(selected)}`, {
                        method: "DELETE",
                        body: "{}",
                      });
                      setDeleteTeam(false);
                      setInvite(null);
                      setSelected("");
                      setMessage("Equipo eliminado.");
                      refresh();
                    })
                  }
                >
                  Confirmar eliminación de equipo
                </button>
                <button
                  type="button"
                  className="workspace__secondary"
                  disabled={busy}
                  onClick={() => setDeleteTeam(false)}
                >
                  Cancelar
                </button>
              </div>
            )}
            <p>
              El código permite unirse al equipo. Después asigna los roles necesarios en cada
              proyecto. Compártelo solo con la persona prevista.
            </p>
            <button
              className="workspace__secondary"
              type="button"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  setInvite(
                    await api(`/teams/${encodeURIComponent(selected)}/invitations`, {
                      method: "POST",
                      body: "{}",
                    }),
                  );
                  setMessage("Invitación generada. Copia el código para compartirlo.");
                })
              }
            >
              Generar invitación
            </button>
            {invite && (
              <div>
                <p>
                  Código de un solo uso; vence el {new Date(invite.expiresAt).toLocaleString("es")}.
                </p>
                <label className="workspace__field">
                  Código generado
                  <input readOnly value={invite.code} />
                </label>
              </div>
            )}
          </>
        )}
        <h3 className="typography__heading">Integrantes</h3>
        {members.map((member) => (
          <article className="projects-view__item" key={member.id}>
            <div>
              {member.name} · {member.role === "owner" ? "Propietario" : "Integrante"}
            </div>
            {team?.role === "owner" && member.role === "member" && (
              <button
                type="button"
                className="workspace__danger"
                disabled={busy}
                onClick={() => setRemoving(member)}
              >
                Quitar integrante
              </button>
            )}
            {removing?.id === member.id && (
              <div>
                <p>¿Quitar a {member.name}? Perderá acceso a todos los proyectos del espacio.</p>
                <button
                  type="button"
                  className="workspace__danger"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      await api(
                        `/teams/${encodeURIComponent(selected)}/members/${encodeURIComponent(member.id)}`,
                        { method: "DELETE", body: "{}" },
                      );
                      setRemoving(null);
                      setMessage("Integrante retirado.");
                      refresh();
                    })
                  }
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  className="workspace__secondary"
                  onClick={() => setRemoving(null)}
                  disabled={busy}
                >
                  Cancelar
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
