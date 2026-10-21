import React, { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, SVGProps } from "react";
import { filterBugs, filterCases, filterEvidence, filterRuns } from "./utils/filterItems";
import CaseBuilder from "./CaseBuilder";
import Dialog from "./Dialog";
import { api, loadProject } from "./api";
import type { Project, User } from "./api";
import AccountSettingsView from "./views/AccountSettingsView";
type WorkspaceData = Awaited<ReturnType<typeof loadProject>>;
import type {
  Bug,
  Evidence,
  IconName,
  NavigationPage,
  PriorityLevel,
  TestCase,
  TestRun,
} from "./types";

const navigation: {
  section: string;
  items: { id: NavigationPage; label: string; icon: IconName; count?: string }[];
}[] = [
  { section: "WORKSPACE", items: [
    { id: "overview", label: "Resumen", icon: "grid" },
    { id: "bugs", label: "Bugs", icon: "bug", count: undefined },
    { id: "cases", label: "Casos de prueba", icon: "check-square" },
    { id: "case-builder", label: "Diseñar test cases", icon: "sparkle" },
    { id: "runs", label: "Test runs", icon: "play" },
    { id: "evidence", label: "Evidencias", icon: "image" },
  ] },
  { section: "GESTIÓN", items: [
    { id: "team", label: "Equipo", icon: "users" },
    { id: "settings", label: "Configuración", icon: "settings" },
  ] },
];

function Icon({ name, size = 18, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  const common: SVGProps<SVGSVGElement> = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", ...props };
  const shapes = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    bug: <><path d="M8 9h8v7a4 4 0 0 1-8 0V9Z" /><path d="M10 6a2 2 0 0 1 4 0M12 13v3M5 12h3m8 0h3M6 6l2 2m10-2-2 2M6 18l2-2m10 2-2-2" /></>,
    "check-square": <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="m8 12 2.5 2.5L16.5 9" /></>,
    play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></>,
    users: <><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="8" r="3.5" /><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1A1.7 1.7 0 0 0 4.2 12H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" transform="translate(1 1) scale(.91)" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    dots: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v4h16v-4" /></>,
    filter: <><path d="M4 7h16M7 12h10m-7 5h4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    file: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z" /><path d="M13 3v7h7M8 14h8m-8 4h8" /></>,
  };
  return <svg {...common} aria-hidden="true">{shapes[name] || shapes.file}</svg>;
}

function Avatar({ initials, color = "blue", small = false }: { initials: string; color?: Bug["color"]; small?: boolean }) {
  return <span className={`avatar avatar-${color}${small ? " avatar-small" : ""}`}>{initials}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`status status-${key}`}><i />{status}</span>;
}

function Priority({ level }: { level: PriorityLevel }) {
  return <span className={`priority priority-${level.toLowerCase()}`}><span />{level}</span>;
}

function App({ user, onUserUpdated, onLogout, themeControl }: { user: User; onUserUpdated: (user: User) => void; onLogout: () => void; themeControl: React.ReactNode }) {
  const [activePage, setActivePage] = useState<NavigationPage>("overview");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState<WorkspaceData>({ bugs: [], cases: [], runs: [], evidence: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  const [detail, setDetail] = useState<object | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const project = projects.find((p) => p.id === projectId);
  const { bugs, cases, runs, evidence } = data;
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    const abort = new AbortController();
    void api<Project[]>("/projects", { signal: abort.signal }).then((items) => {
      if (abort.signal.aborted) return;
      setProjects(items); setProjectId((current) => items.some((p) => p.id === current) ? current : items[0]?.id ?? "");
      if (!items.length) setLoading(false);
    }).catch((cause: unknown) => { if (!abort.signal.aborted) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los proyectos."); setLoading(false); } });
    return () => abort.abort();
  }, [revision]);
  useEffect(() => {
    if (!projectId) return;
    const abort = new AbortController();
    setLoading(true); setError(""); setData({ bugs: [], cases: [], runs: [], evidence: [] });
    void loadProject(projectId, abort.signal).then((items) => { if (!abort.signal.aborted) setData(items); })
      .catch((cause: unknown) => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los datos."); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [projectId, revision]);
  const visibleBugs = useMemo(() => filterBugs(bugs, { search, statusFilter }), [bugs, search, statusFilter]);
  const visibleCases = useMemo(() => filterCases(cases, { search, statusFilter }), [cases, search, statusFilter]);
  const visibleRuns = useMemo(() => filterRuns(runs, { search, statusFilter }), [runs, search, statusFilter]);
  const visibleEvidence = useMemo(() => filterEvidence(evidence, { search }), [evidence, search]);
  const pageTitle = ({ overview: "Resumen", bugs: "Bugs", cases: "Casos de prueba", runs: "Test runs", evidence: "Evidencias", team: "Equipo", settings: "Configuración", "case-builder": "Diseñar test cases" })[activePage];
  const notify = (message: string) => { clearTimeout(toastTimer.current); setToast(message); toastTimer.current = setTimeout(() => setToast(""), 4000); };
  function navigate(page: NavigationPage) { setActivePage(page); setSearch(""); setStatusFilter("Todos"); setMobileNav(false); }
  function openModal(value: string) { setFormError(""); setModal(value); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || saving) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    let path = "/bugs";
    let body: Record<string, unknown> = { projectId, title, description: String(form.get("description") ?? ""), priority: String(form.get("priority") ?? "Media") };
    if (modal === "case") {
      path = "/test-cases";
      const action = String(form.get("action") ?? "").trim();
      const expectedResult = String(form.get("expectedResult") ?? "").trim();
      if (Boolean(action) !== Boolean(expectedResult)) { setFormError("Completa la acción y el resultado esperado, o deja ambos vacíos."); return; }
      body = { projectId, title, suite: String(form.get("suite") ?? ""), preconditions: String(form.get("preconditions") ?? ""), steps: action ? [{ action, expectedResult }] : [] };
    } else if (modal === "run") {
      path = "/test-runs";
      body = { projectId, title, owner: user.name, caseIds: form.getAll("caseIds") };
    } else if (modal === "evidence") {
      path = "/evidence";
      const file = form.get("file");
      if (!(file instanceof File) || !file.name) { setFormError("Selecciona un archivo para registrar sus metadatos."); return; }
      body = { projectId, name: file.name, type: file.type.startsWith("image/") ? "Imagen" : file.type.startsWith("video/") ? "Video" : "Archivo", sizeBytes: file.size, related: String(form.get("related") ?? "") || null };
    }
    setSaving(true); setFormError("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      setModal(""); setRevision((n) => n + 1);
      setActivePage(path === "/test-cases" ? "cases" : path === "/test-runs" ? "runs" : path === "/evidence" ? "evidence" : "bugs");
      notify(path === "/evidence" ? "Metadatos guardados. El archivo no se subió." : "Registro guardado en PostgreSQL.");
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setSaving(false); }
  }
  const filters = activePage === "bugs" ? ["Todos", "Abierto", "En progreso", "En revisión", "Resuelto"] : activePage === "cases" ? ["Todos", "Aprobado", "Fallido", "Pendiente"] : activePage === "runs" ? ["Todos", "En curso", "Completado"] : [];
  const isListing = ["bugs", "cases", "runs", "evidence"].includes(activePage);
  const total = activePage === "bugs" ? visibleBugs.length : activePage === "cases" ? visibleCases.length : activePage === "runs" ? visibleRuns.length : visibleEvidence.length;
  return <div className="app-shell workspace">
    <aside className={`sidebar${mobileNav ? " sidebar-open" : ""}`}>
      <div className="brand"><img className="brand__icon" src="/favicon.svg" width="25" height="25" alt="" /><span>qaTest<span className="brand-light">GE</span></span><button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><Icon name="close" /></button></div>
      <div className="workspace__identity"><strong>{project?.name ?? "Tu workspace"}</strong><small>Cuenta de {user.name}</small></div>
      <div className="sidebar-nav">{navigation.map((group) => <div className="nav-group" key={group.section}><div className="nav-label">{group.section}</div>{group.items.map((item) => <button className={`nav-item${activePage === item.id ? " nav-active" : ""}`} key={item.id} onClick={() => navigate(item.id)}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.id === "bugs" && <span className="nav-count">{bugs.length}</span>}</button>)}</div>)}</div>
      <a className="portal-docs__link" href="/api/docs/" target="_blank" rel="noreferrer"><Icon name="file" />SwaggerUI · API ↗</a>
      <div className="sidebar-bottom"><div className="workspace__identity"><Avatar initials={user.name.slice(0, 2).toUpperCase()} color="orange" /><strong>{user.name}</strong><small>Sesión activa</small></div></div>
    </aside>
    {mobileNav && <button className="scrim" aria-label="Cerrar menú" onClick={() => setMobileNav(false)} />}
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><span className="hamburger" /></button><span>{project?.name ?? "Workspace"}</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div><div className="topbar-actions">{themeControl}<button className="session__logout" onClick={onLogout}>Salir</button><span className="ai-pill"><Icon name="sparkle" size={15} /> IA no conectada</span></div></header>
      <div className="page-content">
        <div className="welcome-row"><div><div className="eyebrow">{new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div><h1>{activePage === "overview" ? `Hola, ${user.name}` : pageTitle}</h1><p className="page-subtitle">{pageDescription(activePage)}</p></div>
          {!["case-builder", "team", "settings"].includes(activePage) && <button disabled={!projectId || loading || saving || Boolean(error)} className="button button-primary" onClick={() => openModal(activePage === "cases" ? "case" : activePage === "runs" ? "run" : activePage === "evidence" ? "evidence" : "bug")}><Icon name="plus" />{activePage === "cases" ? "Nuevo caso" : activePage === "runs" ? "Nueva ejecución" : activePage === "evidence" ? "Registrar metadatos" : "Nuevo bug"}</button>}
        </div>
        <div className="workspace__toolbar"><label>Proyecto<select disabled={saving} value={projectId} onChange={(event) => { setData({ bugs: [], cases: [], runs: [], evidence: [] }); setLoading(true); setProjectId(event.target.value); }}><option value="" disabled>Selecciona un proyecto</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name} · #{p.id}</option>)}</select></label><button className="workspace__secondary" disabled={loading || saving} onClick={() => { setError(""); setLoading(true); setRevision((n) => n + 1); }}>Actualizar</button></div>
        {loading && <p className="workspace__notice" role="status">Cargando datos del proyecto…</p>}
        {error && <p className="workspace__error" role="alert">{error}</p>}
        {!loading && !error && !projectId && <p className="workspace__notice">No tienes proyectos disponibles. El administrador debe conceder acceso a un espacio existente.</p>}
        {activePage === "settings" ? <AccountSettingsView user={user} onUserUpdated={onUserUpdated} /> : activePage === "case-builder" ? <CaseBuilder /> : !loading && !error && projectId && (activePage === "overview" ? <>
          <div className="workspace__metrics">{[["Bugs abiertos", bugs.filter((b) => b.status !== "Resuelto").length], ["Casos de prueba", cases.length], ["Ejecuciones activas", runs.filter((r) => r.status === "En curso").length], ["Evidencias", evidence.length]].map(([label, value]) => <div className="workspace__metric" key={label}><span>{label}</span><strong>{value}</strong><small>Proyecto actual · PostgreSQL</small></div>)}</div>
          <section className="workspace__panel"><h2>Bugs recientes</h2><BugTable bugs={bugs.slice(0, 5)} onSelect={setDetail} />{!bugs.length && <p className="workspace__notice">Aún no hay bugs en este proyecto.</p>}</section>
          <section className="workspace__panel"><h2>Ejecuciones recientes</h2><RunTable items={runs.slice(0, 5)} onSelect={setDetail} />{!runs.length && <p className="workspace__notice">Aún no hay ejecuciones. Crea casos y agrúpalos en una ejecución.</p>}</section>
        </> : isListing ? <section className="listing-card">
          <div className="listing-toolbar"><div className="listing-tabs">{filters.map((filter) => <button key={filter} className={`filter-tab${statusFilter === filter ? " filter-tab-active" : ""}`} onClick={() => setStatusFilter(filter)}>{filter}</button>)}</div><label className="search-field"><Icon name="search" /><input aria-label="Buscar registros" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar ${pageTitle.toLowerCase()}…`} /></label></div>
          {activePage === "bugs" && <BugTable bugs={visibleBugs} onSelect={setDetail} />}
          {activePage === "cases" && <CaseTable items={visibleCases} onSelect={setDetail} />}
          {activePage === "runs" && <RunTable items={visibleRuns} onSelect={setDetail} />}
          {activePage === "evidence" && <EvidenceTable items={visibleEvidence} onSelect={setDetail} />}
          {!total && <p className="workspace__notice">No hay registros que coincidan con los filtros.</p>}
          <div className="table-footer"><span>{total} resultados · datos del proyecto</span></div>
        </section> : <PlaceholderPage page={activePage} onNavigate={navigate} />)}
        <footer className="page-footer"><span>© {new Date().getFullYear()} qaTestGE</span><span>{error ? "Datos no disponibles" : loading ? "Actualizando datos…" : "Datos persistidos en PostgreSQL"}</span></footer>
      </div>
    </main>
    {modal && <Dialog title={modal === "bug" ? "Nuevo bug" : modal === "case" ? "Nuevo caso de prueba" : modal === "run" ? "Nueva ejecución" : "Registrar metadatos"} onClose={() => { if (!saving) setModal(""); }}><form className="workspace__form" onSubmit={(event) => void save(event)} aria-busy={saving}>
      <fieldset disabled={saving} className="workspace__fieldset">
        <label className="workspace__field">Proyecto<input value={project?.name ?? ""} readOnly /></label>
        {modal !== "evidence" && <label className="workspace__field">Título<input name="title" maxLength={200} required /></label>}
        {modal === "bug" && <><label className="workspace__field">Descripción<textarea name="description" maxLength={5000} rows={4} /></label><label className="workspace__field">Prioridad<select name="priority" defaultValue="Media"><option>Crítica</option><option>Alta</option><option>Media</option><option>Baja</option></select></label></>}
        {modal === "case" && <><label className="workspace__field">Suite<input name="suite" maxLength={100} required /></label><label className="workspace__field">Precondiciones<textarea name="preconditions" maxLength={10000} /></label><label className="workspace__field">Acción (opcional)<textarea name="action" maxLength={10000} /></label><label className="workspace__field">Resultado esperado<textarea name="expectedResult" maxLength={10000} /></label></>}
        {modal === "run" && <fieldset className="workspace__fieldset"><legend>Casos de este proyecto</legend>{cases.map((c) => <label className="workspace__check" key={c.id}><input type="checkbox" name="caseIds" value={c.id} />{c.id} · {c.title}</label>)}{!cases.length && <p>Crea primero tus casos de prueba o guarda una ejecución vacía.</p>}</fieldset>}
        {modal === "evidence" && <><p className="workspace__notice">Solo se guardarán nombre, tipo, tamaño y vínculo. El contenido del archivo no se sube.</p><label className="workspace__field">Archivo<input name="file" type="file" required /></label><label className="workspace__field">Vincular a<select name="related"><option value="">Sin vincular</option>{[...bugs, ...cases, ...runs].map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}</select></label></>}
      </fieldset>
      {formError && <p className="workspace__error" role="alert">{formError}</p>}
      <div className="workspace__actions"><button type="button" className="workspace__secondary" disabled={saving} onClick={() => setModal("")}>Cancelar</button><button type="submit" disabled={saving} className="button button-primary">{saving ? "Guardando…" : "Guardar"}</button></div>
    </form></Dialog>}
    {detail && <Dialog title="Detalle del registro" onClose={() => setDetail(null)}><dl className="workspace__detail">{Object.entries(detail).filter(([key]) => !["color", "updated", "date", "cases", "size"].includes(key)).map(([key, value]) => <React.Fragment key={key}><dt>{({ title: "Título", description: "Descripción", status: "Estado", project: "Proyecto", projectId: "ID de proyecto", priority: "Prioridad", assignee: "Responsable", suite: "Suite", preconditions: "Precondiciones", steps: "Pasos", owner: "Responsable", caseIds: "Casos", caseCount: "Cantidad de casos", progress: "Progreso", name: "Nombre", type: "Tipo", related: "Vinculado a", sizeBytes: "Tamaño en bytes", createdAt: "Creación" } as Record<string, string>)[key] ?? key}</dt><dd>{typeof value === "object" ? <pre>{JSON.stringify(value, null, 2)}</pre> : String(value ?? "—")}</dd></React.Fragment>)}</dl></Dialog>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function pageDescription(page: NavigationPage): string {
  return ({
    overview: "Aquí tienes el estado de calidad de tus proyectos.",
    bugs: "Registra, prioriza y da seguimiento a las incidencias de tus proyectos.",
    cases: "Organiza los escenarios que mantienen tu producto bajo control.",
    runs: "Ejecuta suites de prueba y consulta sus resultados.",
    evidence: "Capturas, videos y archivos vinculados a tu actividad de QA.",
    team: "Personas y roles del espacio de trabajo.",
    settings: "Preferencias del workspace y de tu perfil.",
    "case-builder": "De una idea a un plan de pruebas: explora la maqueta del futuro asistente.",
  })[page];
}

function BugTable({ bugs, onSelect, compact = false }: {
  bugs: Bug[];
  onSelect: (bug: Bug) => void;
  compact?: boolean;
}) {
  return <div className={`table-scroll${compact ? " table-compact" : ""}`}><table><thead><tr><th>BUG ID</th><th>TÍTULO</th><th>PRIORIDAD</th><th>ESTADO</th><th>ASIGNADO</th><th>CREADO</th><th /></tr></thead><tbody>
    {bugs.map((bug) => <tr key={bug.id} onClick={() => onSelect(bug)}><td><span className="id-text">{bug.id}</span></td><td><span className="bug-title">{bug.title}</span><span className="table-project">{bug.project}</span></td><td><Priority level={bug.priority} /></td><td><StatusBadge status={bug.status} /></td><td><span className="assignee"><Avatar initials={bug.assignee} color={bug.color} small /><span>{bug.assignee}</span></span></td><td className="muted-cell">{bug.updated}</td><td><button className="row-more" aria-label={`Más opciones para ${bug.id}`} onClick={(event) => { event.stopPropagation(); onSelect(bug); }}><Icon name="dots" size={18} /></button></td></tr>)}
  </tbody></table></div>;
}

function CaseTable({ items, onSelect }: { items: TestCase[]; onSelect: (item: TestCase) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>CASO ID</th><th>NOMBRE DEL CASO</th><th>SUITE</th><th>ESTADO</th><th>CREADO</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => onSelect(item)}><td><span className="id-text">{item.id}</span></td><td><span className="bug-title">{item.title}</span></td><td><span className="suite-badge">{item.suite}</span></td><td><StatusBadge status={item.status} /></td><td className="muted-cell">{item.updated}</td><td><button className="row-more" aria-label={`Más opciones para ${item.id}`}><Icon name="dots" size={18} /></button></td></tr>)}</tbody></table></div>;
}

function RunTable({ items, onSelect }: { items: TestRun[]; onSelect: (item: TestRun) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>RUN ID</th><th>NOMBRE DE EJECUCIÓN</th><th>CASOS</th><th>PROGRESO</th><th>ESTADO</th><th>RESPONSABLE</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => onSelect(item)}><td><span className="id-text">{item.id}</span></td><td><span className="bug-title">{item.title}</span></td><td className="muted-cell">{item.cases}</td><td><div className="table-progress"><span><i style={{ width: `${item.progress}%` }} /></span>{item.progress}%</div></td><td><StatusBadge status={item.status} /></td><td className="muted-cell">{item.owner}</td><td><button className="row-more" aria-label={`Más opciones para ${item.id}`}><Icon name="dots" size={18} /></button></td></tr>)}</tbody></table></div>;
}

function EvidenceTable({ items, onSelect }: { items: Evidence[]; onSelect: (item: Evidence) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>NOMBRE</th><th>TIPO</th><th>VINCULADO A</th><th>TAMAÑO</th><th>FECHA</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => onSelect(item)}><td><span className="evidence-name"><span className="evidence-file"><Icon name="file" size={17} /></span><span className="bug-title">{item.name}</span></span></td><td><span className="suite-badge">{item.type}</span></td><td><span className="id-text">{item.related}</span></td><td className="muted-cell">{item.size}</td><td className="muted-cell">{item.date}</td><td><button className="row-more" aria-label={`Más opciones para ${item.name}`}><Icon name="dots" size={18} /></button></td></tr>)}</tbody></table></div>;
}

function PlaceholderPage({ page, onNavigate }: {
  page: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
}) {
  const team = page === "team";
  return <section className="placeholder-card"><div className={`placeholder-icon${team ? " placeholder-team" : ""}`}><Icon name={team ? "users" : "settings"} size={24} /></div><div className="eyebrow">QA WORKSPACE</div><h2>{team ? "Tu equipo, en un solo lugar" : "Personaliza tu espacio"}</h2><p>{team ? "La administración de membresías e invitaciones estará disponible en una próxima etapa." : "La configuración se habilitará en una próxima etapa del proyecto."}</p><span className="coming-soon">Disponible próximamente</span><button className="text-link" onClick={() => onNavigate("overview")}>Volver al resumen <Icon name="arrow" size={15} /></button></section>;
}

export default App;
