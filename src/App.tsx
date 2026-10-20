import React, { useMemo, useState } from "react";
import type { FormEvent, SVGProps } from "react";
import { filterBugs, filterCases, filterEvidence, filterRuns } from "./utils/filterItems";
import CaseBuilder from "./CaseBuilder";
import type {
  Bug,
  Evidence,
  IconName,
  NavigationPage,
  PriorityLevel,
  TestCase,
  TestRun,
} from "./types";

const initialBugs: Bug[] = [
  { id: "BUG-248", title: "El checkout falla al aplicar un cupón expirado", project: "Web Store", priority: "Crítica", status: "En progreso", assignee: "LM", color: "violet", updated: "hace 12 min" },
  { id: "BUG-247", title: "El menú lateral se superpone en tablet", project: "Web Store", priority: "Alta", status: "Abierto", assignee: "CR", color: "blue", updated: "hace 48 min" },
  { id: "BUG-246", title: "La fecha aparece en formato incorrecto", project: "Mobile App", priority: "Media", status: "En revisión", assignee: "AM", color: "amber", updated: "hace 2 h" },
  { id: "BUG-245", title: "El botón de exportar no responde en Safari", project: "Dashboard", priority: "Alta", status: "Abierto", assignee: "JP", color: "green", updated: "hace 3 h" },
  { id: "BUG-244", title: "Error de validación en el formulario de registro", project: "Mobile App", priority: "Baja", status: "Resuelto", assignee: "DS", color: "pink", updated: "ayer" },
];

const initialCases: TestCase[] = [
  { id: "TC-089", title: "Compra con tarjeta de crédito válida", suite: "Checkout", status: "Aprobado", updated: "hace 20 min" },
  { id: "TC-088", title: "Aplicar código de descuento activo", suite: "Checkout", status: "Fallido", updated: "hace 35 min" },
  { id: "TC-087", title: "Validar campos obligatorios de registro", suite: "Autenticación", status: "Aprobado", updated: "hace 1 h" },
  { id: "TC-086", title: "Recuperación de contraseña por email", suite: "Autenticación", status: "Pendiente", updated: "hace 2 h" },
  { id: "TC-085", title: "Filtrar productos por categoría", suite: "Catálogo", status: "Aprobado", updated: "ayer" },
];

const initialRuns: TestRun[] = [
  { id: "RUN-042", title: "Regresión — Sprint 18", cases: "24 casos", progress: 83, status: "En curso", owner: "Laura M." },
  { id: "RUN-041", title: "Smoke test — Web Store", cases: "12 casos", progress: 100, status: "Completado", owner: "Carlos R." },
  { id: "RUN-040", title: "Validación de release 2.4", cases: "36 casos", progress: 100, status: "Completado", owner: "Ana M." },
];

const initialEvidence: Evidence[] = [
  { name: "checkout-error.png", type: "Imagen", related: "BUG-248", size: "1.8 MB", date: "Hoy, 10:42" },
  { name: "regresion-sprint18.mp4", type: "Video", related: "RUN-042", size: "12.4 MB", date: "Hoy, 09:18" },
  { name: "captura-mobile.png", type: "Imagen", related: "TC-086", size: "926 KB", date: "Ayer, 16:30" },
];

const navigation: {
  section: string;
  items: { id: NavigationPage; label: string; icon: IconName; count?: string }[];
}[] = [
  { section: "WORKSPACE", items: [
    { id: "overview", label: "Resumen", icon: "grid" },
    { id: "bugs", label: "Bugs", icon: "bug", count: "12" },
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

function App({ user, onLogout, themeControl }: { user: string; onLogout: () => void; themeControl: React.ReactNode }) {
  const [activePage, setActivePage] = useState<NavigationPage>("overview");
  const [bugs, setBugs] = useState(initialBugs);
  const [runs, setRuns] = useState(initialRuns);
  const [cases] = useState(initialCases);
  const [evidence, setEvidence] = useState<Evidence[]>(initialEvidence);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [modal, setModal] = useState("");
  const [toast, setToast] = useState("");
  const [project, setProject] = useState("Web Store");
  const [mobileNav, setMobileNav] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  const visibleBugs = useMemo(
    () => filterBugs(bugs, { search, statusFilter, project }),
    [bugs, search, statusFilter, project],
  );
  const visibleCases = useMemo(
    () => filterCases(cases, { search, statusFilter }),
    [cases, search, statusFilter],
  );
  const visibleRuns = useMemo(
    () => filterRuns(runs, { search, statusFilter }),
    [runs, search, statusFilter],
  );
  const visibleEvidence = useMemo(
    () => filterEvidence(evidence, { search }),
    [evidence, search],
  );

  const pageTitle: string = ({
    overview: "Resumen", bugs: "Bugs", cases: "Casos de prueba", runs: "Test runs",
    evidence: "Evidencias", team: "Equipo", settings: "Configuración", "case-builder": "Diseñar test cases",
  })[activePage];

  function handleCreateBug(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    if (!title) return;
    setBugs((items) => [{
      id: `BUG-${248 + items.length - initialBugs.length + 1}`,
      title,
      project,
      priority: String(form.get("priority")) as PriorityLevel,
      status: "Abierto",
      assignee: "TU",
      color: "blue",
      updated: "ahora",
    }, ...items]);
    setModal("");
    setActivePage("bugs");
    notify("Bug creado en esta sesión.");
  }

  function handleNewRun() {
    setRuns((items) => [{
      id: `RUN-${42 + items.length - initialRuns.length + 1}`,
      title: "Nueva ejecución de pruebas",
      cases: "0 casos",
      progress: 0,
      status: "En curso",
      owner: "Tú",
    }, ...items]);
    setActivePage("runs");
    notify("Test run creado en esta sesión.");
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setEvidence((items) => [{
      name: file.name,
      type: file.type.startsWith("image/") ? "Imagen" : file.type.startsWith("video/") ? "Video" : "Archivo",
      related: "Sin vincular",
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      date: "Ahora",
    }, ...items]);
    setActivePage("evidence");
    notify("Archivo agregado a la vista local; no se subió a un servidor.");
    event.target.value = "";
  }

  function navigate(page: NavigationPage) {
    setActivePage(page);
    setSearch("");
    setStatusFilter("Todos");
    setMobileNav(false);
  }

  const filters = activePage === "bugs"
    ? ["Todos", "Abierto", "En progreso", "En revisión", "Resuelto"]
    : activePage === "cases"
      ? ["Todos", "Aprobado", "Fallido", "Pendiente"]
      : activePage === "runs"
        ? ["Todos", "En curso", "Completado"]
        : [];
  const isListing = ["bugs", "cases", "runs", "evidence"].includes(activePage);

  return (
    <div className="app-shell">
      <aside className={`sidebar${mobileNav ? " sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span>qaTest<span className="brand-light">GE</span></span>
          <button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><Icon name="close" /></button>
        </div>
        <button className="workspace-select" onClick={() => notify("Selector de espacios de trabajo — demo local")}>
          <span className="workspace-icon">Q</span>
          <span className="workspace-copy"><strong>QA Workspace</strong><small>Plan Team</small></span>
          <Icon name="chevron" size={16} />
        </button>
        <div className="sidebar-nav">
          {navigation.map((group) => <div className="nav-group" key={group.section}>
            <div className="nav-label">{group.section}</div>
            {group.items.map((item) => <button className={`nav-item${activePage === item.id ? " nav-active" : ""}`} key={item.id} onClick={() => navigate(item.id)}>
              <Icon name={item.icon} size={18} /><span>{item.label}</span>
              {item.count && <span className="nav-count">{item.count}</span>}
            </button>)}
          </div>)}
        </div>
        <a className="portal-docs__link" href="/api/docs/" target="_blank" rel="noreferrer"><Icon name="file" />SwaggerUI · API ↗</a>
        <div className="sidebar-bottom">
          <div className="storage-card">
            <div className="storage-top"><span>Almacenamiento</span><span>68%</span></div>
            <div className="storage-track"><span /></div>
            <small>6.8 GB de 10 GB usados</small>
          </div>
          <button className="profile-button" onClick={() => notify(`Sesión de demostración: ${user}`)}>
            <Avatar initials={user.slice(0, 2).toUpperCase()} color="orange" />
            <span className="profile-copy"><strong>{user}</strong><small>Usuario de demostración</small></span>
            <Icon name="dots" size={19} />
          </button>
        </div>
      </aside>

      {mobileNav && <button className="scrim" aria-label="Cerrar menú" onClick={() => setMobileNav(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><span className="hamburger" /></button><span>QA Workspace</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-actions">{themeControl}<button className="session__logout" onClick={onLogout}>Salir</button>
            <div className="demo-pill"><span />Demo local</div>
            <span className="ai-pill"><Icon name="sparkle" size={15} /> IA no conectada</span>
            <button className="icon-button notification-button" onClick={() => notify("No tienes notificaciones nuevas.")} aria-label="Notificaciones"><Icon name="bell" /><i /></button>
            <Avatar initials={user.slice(0, 2).toUpperCase()} color="orange" small />
          </div>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow"><span className="live-dot" /> MIÉRCOLES, 14 DE OCTUBRE, 2026</div>
              <h1>{activePage === "overview" ? <>Hola, {user} <span className="wave">✦</span></> : pageTitle}</h1>
              <p className="page-subtitle">{activePage === "overview" ? "Aquí tienes el estado de calidad de tus proyectos." : pageDescription(activePage)}</p>
            </div>
            {activePage !== "case-builder" && <div className="header-buttons">
              {activePage === "overview" && <button className="button button-secondary" onClick={() => notify("Reporte de calidad preparado en la demo local.")}><Icon name="download" size={16} /> Exportar reporte</button>}
              {activePage === "runs" ? <button className="button button-primary" onClick={handleNewRun}><Icon name="plus" size={17} /> Nueva ejecución</button>
                : activePage === "evidence" ? <label className="button button-primary"><Icon name="plus" size={17} /> Agregar evidencia<input type="file" hidden onChange={handleFile} /></label>
                  : <button className="button button-primary" onClick={() => setModal("bug")}><Icon name="plus" size={17} /> Nuevo bug</button>}
            </div>}
          </div>

          {activePage === "overview" ? <Overview
            bugs={visibleBugs}
            runs={runs}
            setActivePage={navigate}
            project={project}
            setProject={setProject}
            onNewRun={handleNewRun}
            onCreateBug={() => setModal("bug")}
          /> : activePage === "case-builder" ? <CaseBuilder /> : isListing ? <section className="listing-card">
            <div className="listing-toolbar">
              <div className="listing-tabs">
                {filters.map((filter) => <button key={filter} className={`filter-tab${statusFilter === filter ? " filter-tab-active" : ""}`} onClick={() => setStatusFilter(filter)}>{filter}{filter === "Todos" && <span>{activePage === "bugs" ? bugs.length : activePage === "cases" ? cases.length : activePage === "runs" ? runs.length : evidence.length}</span>}</button>)}
              </div>
              <div className="listing-tools">
                {activePage === "bugs" && <label className="project-filter"><span>Proyecto</span><select value={project} onChange={(event) => setProject(event.target.value)}><option>Web Store</option><option>Mobile App</option><option>Dashboard</option><option>Todos los proyectos</option></select></label>}
                <label className="search-field"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar ${pageTitle.toLowerCase()}...`} /><kbd>⌘ K</kbd></label>
                <button className="icon-button filter-button" onClick={() => notify("Usa las pestañas para filtrar por estado.")} aria-label="Filtros"><Icon name="filter" /></button>
              </div>
            </div>
            {activePage === "bugs" && <BugTable bugs={visibleBugs} onSelect={() => notify("Detalle del bug — demo local")} />}
            {activePage === "cases" && <CaseTable items={visibleCases} onSelect={() => notify("Detalle del caso de prueba — demo local")} />}
            {activePage === "runs" && <RunTable items={visibleRuns} onSelect={() => notify("Detalle de la ejecución — demo local")} />}
            {activePage === "evidence" && <EvidenceTable items={visibleEvidence} onSelect={() => notify("Vista previa de evidencia — demo local")} />}
            {((activePage === "bugs" && visibleBugs.length === 0) || (activePage === "cases" && visibleCases.length === 0) || (activePage === "runs" && visibleRuns.length === 0) || (activePage === "evidence" && visibleEvidence.length === 0)) && <div className="empty-state">No se encontraron resultados. Prueba otra búsqueda o filtro.</div>}
            <div className="table-footer"><span>Mostrando <strong>{activePage === "bugs" ? visibleBugs.length : activePage === "cases" ? visibleCases.length : activePage === "runs" ? visibleRuns.length : visibleEvidence.length}</strong> resultados <span className="local-note">· datos de ejemplo, solo en esta sesión</span></span><div><button disabled>← Anterior</button><button className="page-number">1</button><button disabled>Siguiente →</button></div></div>
          </section> : <PlaceholderPage page={activePage} onNavigate={navigate} />}
          <footer className="page-footer"><span>© 2026 qaTestGE</span><span>Hecho para equipos que cuidan la calidad <span className="footer-heart">♥</span></span><span>v1.0.0 · Frontend demo</span></footer>
        </div>
      </main>

      {modal === "bug" && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(""); }}>
        <form className="modal-card" onSubmit={handleCreateBug}>
          <div className="modal-heading"><div><div className="modal-icon"><Icon name="bug" size={20} /></div><h2>Crear un bug</h2><p>Registra una incidencia para que el equipo pueda darle seguimiento.</p></div><button type="button" className="icon-button" onClick={() => setModal("")} aria-label="Cerrar"><Icon name="close" /></button></div>
          <label className="form-label">Título <span>*</span><input name="title" required autoFocus placeholder="Describe brevemente el problema" /></label>
          <label className="form-label">Descripción<textarea name="description" rows={3} placeholder="Pasos para reproducir, resultado esperado y actual..." /></label>
          <div className="form-row"><label className="form-label">Prioridad<select name="priority"><option>Media</option><option>Crítica</option><option>Alta</option><option>Baja</option></select></label><label className="form-label">Proyecto<input value={project} readOnly /></label></div>
          <div className="local-warning"><Icon name="file" size={16} /> Se agregará solo a esta sesión. No hay backend conectado.</div>
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal("")}>Cancelar</button><button type="submit" className="button button-primary">Crear bug</button></div>
        </form>
      </div>}
      {toast && <div className="toast"><span className="toast-check">✓</span>{toast}</div>}
    </div>
  );
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

interface OverviewProps {
  bugs: Bug[];
  runs: TestRun[];
  setActivePage: (page: NavigationPage) => void;
  project: string;
  setProject: (project: string) => void;
  onNewRun: () => void;
  onCreateBug: () => void;
}

function Overview({ bugs, runs, setActivePage, project, setProject, onNewRun, onCreateBug }: OverviewProps) {
  return <>
    <div className="project-toolbar">
      <div className="project-switch"><span className="project-dot" /><span>Proyecto:</span><select value={project} onChange={(event) => setProject(event.target.value)}><option>Web Store</option><option>Mobile App</option><option>Dashboard</option><option>Todos los proyectos</option></select><Icon name="chevron" size={14} /></div>
      <div className="updated-label"><Icon name="clock" size={15} /> Actualizado hace 2 min</div>
    </div>
    <section className="metrics-grid">
      <MetricCard label="Bugs abiertos" value={project === "Todos los proyectos" ? "24" : project === "Web Store" ? "12" : "6"} change="3 nuevos esta semana" icon="bug" tone="purple" trend="up" />
      <MetricCard label="Casos de prueba" value="128" change="8 añadidos este mes" icon="check-square" tone="blue" trend="up" />
      <MetricCard label="Tasa de éxito" value="94.2%" change="+2.4% vs. semana anterior" icon="sparkle" tone="green" trend="up" />
      <MetricCard label="Ejecuciones activas" value={String(runs.filter((run) => run.status === "En curso").length).padStart(2, "0")} change="1 ejecución en progreso" icon="play" tone="orange" trend="neutral" />
    </section>
    <section className="dashboard-grid">
      <div className="panel quality-panel">
        <div className="panel-heading"><div><h2>Tendencia de calidad</h2><p>Rendimiento de pruebas durante los últimos 30 días</p></div><button className="select-button" onClick={() => {}}><Icon name="calendar" size={15} /> Últimos 30 días <Icon name="chevron" size={14} /></button></div>
        <div className="chart-legend"><span><i className="legend-purple" /> Pruebas aprobadas <strong>94.2%</strong></span><span><i className="legend-orange" /> Bugs reportados <strong>18</strong></span></div>
        <div className="chart-wrap">
          <div className="chart-y-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
          <svg className="chart" viewBox="0 0 720 210" preserveAspectRatio="none" role="img" aria-label="Gráfico de tendencia ascendente de pruebas aprobadas y bugs reportados">
            <defs><linearGradient id="fillPurple" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7562e8" stopOpacity=".18" /><stop offset="100%" stopColor="#7562e8" stopOpacity="0" /></linearGradient></defs>
            {[10, 55, 100, 145, 190].map((y) => <line key={y} x1="0" y1={y} x2="720" y2={y} className="grid-line" />)}
            <path d="M0 103 C35 93 42 122 78 111 S120 84 150 95 S193 72 225 83 S270 101 300 73 S350 80 375 61 S420 79 450 54 S495 66 525 45 S568 63 600 38 S650 51 680 29 S702 40 720 21 L720 190 L0 190Z" fill="url(#fillPurple)" />
            <path d="M0 103 C35 93 42 122 78 111 S120 84 150 95 S193 72 225 83 S270 101 300 73 S350 80 375 61 S420 79 450 54 S495 66 525 45 S568 63 600 38 S650 51 680 29 S702 40 720 21" fill="none" stroke="#7562e8" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            <path d="M0 154 C36 158 49 139 78 147 S120 159 150 143 S195 153 225 132 S268 148 300 137 S347 145 375 124 S418 136 450 119 S495 133 525 115 S568 127 600 107 S651 119 680 96 S702 105 720 88" fill="none" stroke="#f4a261" strokeWidth="2" strokeDasharray="5 6" vectorEffect="non-scaling-stroke" />
            <circle cx="600" cy="38" r="5" fill="#fff" stroke="#7562e8" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div className="chart-x-labels"><span>15 sep</span><span>20 sep</span><span>25 sep</span><span>30 sep</span><span>05 oct</span><span>10 oct</span><span>14 oct</span></div>
      </div>
      <div className="panel run-panel">
        <div className="panel-heading"><div><h2>Ejecuciones recientes</h2><p>Actividad de tus suites de prueba</p></div><button className="more-button" onClick={() => setActivePage("runs")} aria-label="Ver todas las ejecuciones"><Icon name="dots" /></button></div>
        <div className="run-list">{runs.slice(0, 3).map((run, index) => <div className="run-row" key={run.id}>
          <span className={`run-icon run-icon-${index}`}><Icon name="play" size={17} /></span>
          <div className="run-info"><strong>{run.title}</strong><span>{run.id} <i /> {run.cases}</span><div className="progress-track"><span style={{ width: `${run.progress}%` }} /></div></div>
          <StatusBadge status={run.status} />
        </div>)}</div>
        <button className="text-link run-link" onClick={onNewRun}>Iniciar nueva ejecución <Icon name="arrow" size={15} /></button>
      </div>
    </section>
    <section className="panel bugs-panel">
      <div className="panel-heading"><div><h2>Bugs recientes</h2><p>Incidencias que requieren atención</p></div><button className="button button-small button-secondary" onClick={onCreateBug}><Icon name="plus" size={15} /> Nuevo bug</button></div>
      <BugTable bugs={bugs.slice(0, 4)} onSelect={() => setActivePage("bugs")} compact />
      <button className="text-link all-link" onClick={() => setActivePage("bugs")}>Ver todos los bugs <Icon name="arrow" size={15} /></button>
    </section>
  </>;
}

function MetricCard({ label, value, change, icon, tone, trend }: {
  label: string;
  value: string;
  change: string;
  icon: IconName;
  tone: "purple" | "blue" | "green" | "orange";
  trend: "up" | "neutral";
}) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon metric-${tone}`}><Icon name={icon} size={17} /></span></div><div className="metric-value">{value}</div><div className="metric-change"><span className={`trend trend-${trend}`}>{trend === "up" ? "↗" : "•"}</span>{change}</div><div className={`metric-decoration metric-decoration-${tone}`} /></div>;
}

function BugTable({ bugs, onSelect, compact = false }: {
  bugs: Bug[];
  onSelect: (bug: Bug) => void;
  compact?: boolean;
}) {
  return <div className={`table-scroll${compact ? " table-compact" : ""}`}><table><thead><tr><th>BUG ID</th><th>TÍTULO</th><th>PRIORIDAD</th><th>ESTADO</th><th>ASIGNADO</th><th>ACTUALIZADO</th><th /></tr></thead><tbody>
    {bugs.map((bug) => <tr key={bug.id} onClick={() => onSelect(bug)}><td><span className="id-text">{bug.id}</span></td><td><span className="bug-title">{bug.title}</span><span className="table-project">{bug.project}</span></td><td><Priority level={bug.priority} /></td><td><StatusBadge status={bug.status} /></td><td><span className="assignee"><Avatar initials={bug.assignee} color={bug.color} small /><span>{bug.assignee}</span></span></td><td className="muted-cell">{bug.updated}</td><td><button className="row-more" aria-label={`Más opciones para ${bug.id}`} onClick={(event) => { event.stopPropagation(); onSelect(bug); }}><Icon name="dots" size={18} /></button></td></tr>)}
  </tbody></table></div>;
}

function CaseTable({ items, onSelect }: { items: TestCase[]; onSelect: (item: TestCase) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>CASO ID</th><th>NOMBRE DEL CASO</th><th>SUITE</th><th>ESTADO</th><th>ACTUALIZADO</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => onSelect(item)}><td><span className="id-text">{item.id}</span></td><td><span className="bug-title">{item.title}</span></td><td><span className="suite-badge">{item.suite}</span></td><td><StatusBadge status={item.status} /></td><td className="muted-cell">{item.updated}</td><td><button className="row-more" aria-label={`Más opciones para ${item.id}`}><Icon name="dots" size={18} /></button></td></tr>)}</tbody></table></div>;
}

function RunTable({ items, onSelect }: { items: TestRun[]; onSelect: (item: TestRun) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>RUN ID</th><th>NOMBRE DE EJECUCIÓN</th><th>CASOS</th><th>PROGRESO</th><th>ESTADO</th><th>RESPONSABLE</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => onSelect(item)}><td><span className="id-text">{item.id}</span></td><td><span className="bug-title">{item.title}</span></td><td className="muted-cell">{item.cases}</td><td><div className="table-progress"><span><i style={{ width: `${item.progress}%` }} /></span>{item.progress}%</div></td><td><StatusBadge status={item.status} /></td><td className="muted-cell">{item.owner}</td><td><button className="row-more" aria-label={`Más opciones para ${item.id}`}><Icon name="dots" size={18} /></button></td></tr>)}</tbody></table></div>;
}

function EvidenceTable({ items, onSelect }: { items: Evidence[]; onSelect: (item: Evidence) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>NOMBRE</th><th>TIPO</th><th>VINCULADO A</th><th>TAMAÑO</th><th>FECHA</th><th /></tr></thead><tbody>{items.map((item) => <tr key={`${item.name}-${item.date}`} onClick={() => onSelect(item)}><td><span className="evidence-name"><span className="evidence-file"><Icon name="file" size={17} /></span><span className="bug-title">{item.name}</span></span></td><td><span className="suite-badge">{item.type}</span></td><td><span className="id-text">{item.related}</span></td><td className="muted-cell">{item.size}</td><td className="muted-cell">{item.date}</td><td><button className="row-more" aria-label={`Más opciones para ${item.name}`}><Icon name="dots" size={18} /></button></td></tr>)}</tbody></table></div>;
}

function PlaceholderPage({ page, onNavigate }: {
  page: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
}) {
  const team = page === "team";
  return <section className="placeholder-card"><div className={`placeholder-icon${team ? " placeholder-team" : ""}`}><Icon name={team ? "users" : "settings"} size={24} /></div><div className="eyebrow">QA WORKSPACE</div><h2>{team ? "Tu equipo, en un solo lugar" : "Personaliza tu espacio"}</h2><p>{team ? "La gestión de miembros estará disponible cuando se conecte el backend." : "La configuración se habilitará en una próxima etapa del proyecto."}</p><span className="coming-soon">Disponible próximamente</span><button className="text-link" onClick={() => onNavigate("overview")}>Volver al resumen <Icon name="arrow" size={15} /></button></section>;
}

export default App;
