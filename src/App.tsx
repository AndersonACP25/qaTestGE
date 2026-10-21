import React, { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, SVGProps } from "react";
import { filterBugs, filterCases, filterEvidence, filterRuns } from "./utils/filterItems";
import CaseBuilder from "./CaseBuilder";
import Dialog from "./Dialog";
import {
  addTestCaseLink,
  api,
  deleteTestCase,
  deleteTestCaseAttachment,
  listTestCaseAttachments,
  loadProject,
  saveBugStatus,
  saveCaseStatus,
  testCaseImageUrl,
  updateTestCase,
  uploadTestCaseImage,
} from "./api";
import type { BugTemplate, BugTemplatePriority, Project, User } from "./api";
import AccountSettingsView from "./views/AccountSettingsView";
import RecordDetailsDialog, { type RecordDetail } from "./views/RecordDetailsDialog";
import { exportRecord, recordExportFormats } from "./utils/exportRecord";
import type { ExportFormat, ExportRecord } from "./utils/exportRecord";
import type { CreateTestCaseInput } from "../backend/src/models/test-case.model";
type WorkspaceData = Awaited<ReturnType<typeof loadProject>>;
import type {
  Bug,
  Evidence,
  IconName,
  NavigationPage,
  PriorityLevel,
  BugStatus,
  CaseStatus,
  TestCase,
  TestCaseAttachment,
  TestRun,
} from "./types";
import { bugStatuses, caseStatuses } from "./types";
import {
  loadCaseCountDefaults,
  saveCaseCountDefaults,
  type CaseCountDefaults,
} from "./models/caseCountDefaults";

const navigation: {
  section: string;
  items: { id: NavigationPage; label: string; icon: IconName; count?: string }[];
}[] = [
  {
    section: "WORKSPACE",
    items: [
      { id: "overview", label: "Resumen", icon: "grid" },
      { id: "bugs", label: "Bugs", icon: "bug", count: undefined },
      { id: "cases", label: "Casos de prueba", icon: "check-square" },
      { id: "case-builder", label: "Diseñar test cases", icon: "sparkle" },
      { id: "runs", label: "Test runs", icon: "play" },
      { id: "evidence", label: "Evidencias", icon: "image" },
    ],
  },
  { section: "CUENTA", items: [{ id: "settings", label: "Configuración", icon: "settings" }] },
];

function Icon({
  name,
  size = 18,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  const common: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...props,
  };
  const shapes = {
    grid: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </>
    ),
    bug: (
      <>
        <path d="M8 9h8v7a4 4 0 0 1-8 0V9Z" />
        <path d="M10 6a2 2 0 0 1 4 0M12 13v3M5 12h3m8 0h3M6 6l2 2m10-2-2 2M6 18l2-2m10 2-2-2" />
      </>
    ),
    "check-square": (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
        <path d="m8 12 2.5 2.5L16.5 9" />
      </>
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 6 4-6 4V8Z" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m21 15-5-5L5 20" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path
          d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1A1.7 1.7 0 0 0 4.2 12H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"
          transform="translate(1 1) scale(.91)"
        />
      </>
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    bell: (
      <>
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    dots: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v4h16v-4" />
      </>
    ),
    filter: (
      <>
        <path d="M4 7h16M7 12h10m-7 5h4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
      </>
    ),
    close: (
      <>
        <path d="m18 6-12 12M6 6l12 12" />
      </>
    ),
    file: (
      <>
        <path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z" />
        <path d="M13 3v7h7M8 14h8m-8 4h8" />
      </>
    ),
  };
  return (
    <svg {...common} aria-hidden="true">
      {shapes[name] || shapes.file}
    </svg>
  );
}

function Avatar({
  initials,
  color = "blue",
  small = false,
}: {
  initials: string;
  color?: Bug["color"];
  small?: boolean;
}) {
  return (
    <span className={`avatar avatar-${color}${small ? " avatar-small" : ""}`}>{initials}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replaceAll(" ", "-");
  return (
    <span className={`status status-${key}`}>
      <i />
      {status}
    </span>
  );
}

function Priority({ level }: { level: PriorityLevel }) {
  return (
    <span className={`priority priority-${level.toLowerCase()}`}>
      <span />
      {level}
    </span>
  );
}

function isTestCaseRecord(value: object): value is TestCase {
  return "steps" in value && "suite" in value && "id" in value;
}

function CaseAttachmentsPanel({ testCase }: { testCase: TestCase }) {
  const [attachments, setAttachments] = useState<TestCaseAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [attachmentError, setAttachmentError] = useState("");
  const [deletingAttachment, setDeletingAttachment] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!testCase.projectId) {
      setAttachmentError("No se puede consultar adjuntos sin el proyecto asociado.");
      setLoadingAttachments(false);
      return;
    }
    const abort = new AbortController();
    setLoadingAttachments(true);
    setAttachmentError("");
    void listTestCaseAttachments(testCase.id, testCase.projectId)
      .then((items) => {
        if (!abort.signal.aborted) setAttachments(items);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setAttachmentError(
            cause instanceof Error ? cause.message : "No se pudieron cargar los adjuntos.",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoadingAttachments(false);
      });
    return () => abort.abort();
  }, [testCase.id, testCase.projectId, revision]);
  async function removeAttachment(attachment: TestCaseAttachment) {
    if (!testCase.projectId || deletingAttachment) return;
    setDeletingAttachment(attachment.id);
    setAttachmentError("");
    try {
      await deleteTestCaseAttachment(testCase.id, attachment.id, testCase.projectId);
      setRevision((current) => current + 1);
    } catch (cause) {
      setAttachmentError(
        cause instanceof Error ? cause.message : "No se pudo eliminar el adjunto.",
      );
    } finally {
      setDeletingAttachment("");
    }
  }
  return (
    <section className="workspace__attachments" aria-label="Adjuntos del caso">
      <h3>Imágenes y enlaces</h3>
      {loadingAttachments && <p className="workspace__notice">Cargando adjuntos…</p>}
      {attachmentError && (
        <p className="workspace__error" role="alert">
          {attachmentError}
        </p>
      )}
      {!loadingAttachments && !attachmentError && !attachments.length && (
        <p className="workspace__notice">
          Este caso todavía no tiene imágenes ni enlaces adjuntos.
        </p>
      )}
      {attachments.map((attachment) => (
        <div className="workspace__attachment" key={attachment.id}>
          {attachment.kind === "image" ? (
            <a
              href={testCaseImageUrl(testCase.id, attachment.id, attachment.projectId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={testCaseImageUrl(testCase.id, attachment.id, attachment.projectId)}
                alt={attachment.name}
              />
              <span>{attachment.name}</span>
            </a>
          ) : (
            <a href={attachment.url ?? undefined} target="_blank" rel="noopener noreferrer">
              {attachment.name}
              <span>{attachment.url}</span>
            </a>
          )}
          <button
            type="button"
            className="workspace__secondary"
            disabled={Boolean(deletingAttachment)}
            onClick={() => void removeAttachment(attachment)}
          >
            {deletingAttachment === attachment.id ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      ))}
    </section>
  );
}

function App({
  user,
  onUserUpdated,
  onAccountDeleted,
  onLogout,
  themeControl,
}: {
  user: User;
  onUserUpdated: (user: User) => void;
  onAccountDeleted: () => void;
  onLogout: () => void;
  themeControl: React.ReactNode;
}) {
  const [activePage, setActivePage] = useState<NavigationPage>("overview");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState<WorkspaceData>({ bugs: [], cases: [], runs: [], evidence: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState("");
  const [caseCountDefaults, setCaseCountDefaults] = useState<CaseCountDefaults>(() =>
    loadCaseCountDefaults(user.id),
  );
  const [modal, setModal] = useState("");
  const [bugTemplates, setBugTemplates] = useState<BugTemplate[]>([]);
  const [bugTemplatesLoading, setBugTemplatesLoading] = useState(false);
  const [bugTemplatesError, setBugTemplatesError] = useState("");
  const [selectedBugTemplateId, setSelectedBugTemplateId] = useState("");
  const [bugForm, setBugForm] = useState<{
    title: string;
    description: string;
    priority: BugTemplatePriority;
  }>({ title: "", description: "", priority: "Media" });
  const [caseSteps, setCaseSteps] = useState([{ action: "", expectedResult: "" }]);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [caseImageFiles, setCaseImageFiles] = useState<File[]>([]);
  const [caseImageDragging, setCaseImageDragging] = useState(false);
  const [exportTarget, setExportTarget] = useState<ExportRecord | null>(null);
  const [deleteCaseTarget, setDeleteCaseTarget] = useState<TestCase | null>(null);
  const [deleteCaseError, setDeleteCaseError] = useState("");
  const [deleteCaseBusy, setDeleteCaseBusy] = useState(false);
  const [exportingRecord, setExportingRecord] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  const [detail, setDetail] = useState<object | null>(null);
  const [recordDetail, setRecordDetail] = useState<RecordDetail | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const project = projects.find((p) => p.id === projectId);
  const { bugs, cases, runs, evidence } = data;
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    const abort = new AbortController();
    void api<Project[]>("/projects", { signal: abort.signal })
      .then((items) => {
        if (abort.signal.aborted) return;
        setProjects(items);
        setProjectId((current) =>
          items.some((p) => p.id === current) ? current : (items[0]?.id ?? ""),
        );
        if (!items.length) setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los proyectos.");
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [revision]);
  useEffect(() => {
    if (modal !== "bug") return;
    const abort = new AbortController();
    setBugTemplatesLoading(true);
    setBugTemplatesError("");
    void api<BugTemplate[]>("/auth/bug-templates", { signal: abort.signal })
      .then((items) => {
        if (!abort.signal.aborted) setBugTemplates(items);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setBugTemplatesError(
            cause instanceof Error ? cause.message : "No se pudieron cargar las plantillas.",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setBugTemplatesLoading(false);
      });
    return () => abort.abort();
  }, [modal]);
  useEffect(() => {
    if (!projectId) return;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    setData({ bugs: [], cases: [], runs: [], evidence: [] });
    void loadProject(projectId, abort.signal)
      .then((items) => {
        if (!abort.signal.aborted) setData(items);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los datos.");
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [projectId, revision]);
  const visibleBugs = useMemo(
    () => filterBugs(bugs, { search, statusFilter }),
    [bugs, search, statusFilter],
  );
  const visibleCases = useMemo(
    () => filterCases(cases, { search, statusFilter }),
    [cases, search, statusFilter],
  );
  const visibleRuns = useMemo(
    () => filterRuns(runs, { search, statusFilter }),
    [runs, search, statusFilter],
  );
  const visibleEvidence = useMemo(() => filterEvidence(evidence, { search }), [evidence, search]);
  const pageTitle = {
    overview: "Resumen",
    bugs: "Bugs",
    cases: "Casos de prueba",
    runs: "Test runs",
    evidence: "Evidencias",
    settings: "Configuración",
    "case-builder": "Diseñar test cases",
  }[activePage];
  const notify = (message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  };
  function navigate(page: NavigationPage) {
    setActivePage(page);
    setSearch("");
    setStatusFilter("Todos");
    setMobileNav(false);
  }
  function openModal(value: string) {
    setFormError("");
    setEditingCase(null);
    setCaseImageFiles([]);
    setCaseImageDragging(false);
    if (value === "bug") {
      setBugForm({ title: "", description: "", priority: "Media", status: "Abierto", assignee: "" });
      setSelectedBugTemplateId("");
    }
    if (value === "case") setCaseSteps([{ action: "", expectedResult: "" }]);
    if (value === "evidence") setEvidenceForm({ name: "", type: "Archivo", sizeBytes: 0, related: "" });
    setModal(value);
  }
  function editCase(testCase: TestCase) {
    setFormError("");
    setCaseImageFiles([]);
    setEditingCase(testCase);
    setCaseSteps(
      testCase.steps?.length
        ? testCase.steps.map((step) => ({
            action: step.action,
            expectedResult: step.expectedResult,
          }))
        : [{ action: "", expectedResult: "" }],
    );
    setExportTarget(null);
    setModal("edit-case");
  }
  function addCaseImages(files: FileList | File[]) {
    const selected = Array.from(files);
    if (
      selected.some(
        (file) =>
          !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type) ||
          file.size === 0 ||
          file.size > 2 * 1024 * 1024,
      )
    ) {
      setFormError("Solo se admiten imágenes PNG, JPEG, GIF o WebP de hasta 2 MB cada una.");
      return;
    }
    const merged = [
      ...caseImageFiles,
      ...selected.filter(
        (file) =>
          !caseImageFiles.some(
            (existing) =>
              existing.name === file.name &&
              existing.size === file.size &&
              existing.lastModified === file.lastModified,
          ),
      ),
    ];
    if (merged.length > 5) {
      setFormError("Puedes adjuntar hasta 5 imágenes por operación.");
      return;
    }
    setFormError("");
    setCaseImageFiles(merged);
  }
  function applyBugTemplate(templateId: string) {
    setSelectedBugTemplateId(templateId);
    const template = bugTemplates.find((item) => item.id === templateId);
    setBugForm(
      template
        ? { title: template.title, description: template.description, priority: template.priority }
        : { title: "", description: "", priority: "Media" },
    );
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || saving) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    let path = "/bugs";
    let body: Record<string, unknown> = {
      projectId,
      title,
      description: String(form.get("description") ?? ""),
      priority: String(form.get("priority") ?? "Media"),
    };
    let caseInput: Omit<CreateTestCaseInput, "projectId"> | null = null;
    if (modal === "case" || modal === "edit-case") {
      path = "/test-cases";
      const steps = caseSteps.map((step) => ({
        action: step.action.trim(),
        expectedResult: step.expectedResult.trim(),
      }));
      if (steps.some((step) => Boolean(step.action) !== Boolean(step.expectedResult))) {
        setFormError(
          "Completa la acción y el resultado esperado en cada paso, o deja ambos vacíos.",
        );
        return;
      }
      caseInput = {
        title,
        suite: String(form.get("suite") ?? "").trim() || undefined,
        preconditions: String(form.get("preconditions") ?? ""),
        steps: steps.filter((step) => step.action && step.expectedResult),
      };
      body = { projectId, ...caseInput };
    } else if (modal === "run") {
      path = "/test-runs";
      body = { projectId, title, owner: user.name, caseIds: form.getAll("caseIds") };
    } else if (modal === "evidence") {
      path = "/evidence";
      const file = form.get("file");
      if (!(file instanceof File) || !file.name) {
        setFormError("Selecciona un archivo para registrar sus metadatos.");
        return;
      }
      body = {
        projectId,
        name: file.name,
        type: file.type.startsWith("image/")
          ? "Imagen"
          : file.type.startsWith("video/")
            ? "Video"
            : "Archivo",
        sizeBytes: file.size,
        related: String(form.get("related") ?? "") || null,
      };
    }
    setSaving(true);
    setFormError("");
    try {
      if (modal === "case" || modal === "edit-case") {
        if (!caseInput) throw new Error("No se pudo preparar el caso de prueba.");
        const savedCase =
          modal === "edit-case" && editingCase
            ? await updateTestCase(editingCase.id, projectId, caseInput)
            : await api<TestCase>(path, { method: "POST", body: JSON.stringify(body) });
        const links = String(form.get("attachmentLinks") ?? "")
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean);
        try {
          for (const file of caseImageFiles)
            await uploadTestCaseImage(savedCase.id, projectId, file);
          for (const link of links) {
            let name = link;
            try {
              name = new URL(link).hostname;
            } catch {
              /* The API reports malformed URLs. */
            }
            await addTestCaseLink(savedCase.id, projectId, name, link);
          }
        } catch (cause) {
          setModal("");
          setEditingCase(null);
          setCaseImageFiles([]);
          setRevision((n) => n + 1);
          setActivePage("cases");
          notify(
            `El caso ${savedCase.id} se guardó, pero algún adjunto no pudo guardarse: ${cause instanceof Error ? cause.message : "error desconocido"}`,
          );
          return;
        }
        setModal("");
        setEditingCase(null);
        setCaseImageFiles([]);
        setRevision((n) => n + 1);
        setActivePage("cases");
        notify(
          modal === "edit-case"
            ? `Caso ${savedCase.id} actualizado.`
            : "Caso de prueba guardado en PostgreSQL.",
        );
        return;
      }
      await api(path, { method: "POST", body: JSON.stringify(body) });
      setModal("");
      setRevision((n) => n + 1);
      setActivePage(
        path === "/test-cases"
          ? "cases"
          : path === "/test-runs"
            ? "runs"
            : path === "/evidence"
              ? "evidence"
              : "bugs",
      );
      notify(
        path === "/evidence"
          ? "Metadatos guardados. El archivo no se subió."
          : "Registro guardado en PostgreSQL.",
      );
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }
  async function exportSelectedRecord(format: ExportFormat) {
    if (!exportTarget || exportingRecord) return;
    setExportingRecord(true);
    try {
      await exportRecord(format, exportTarget);
      setExportTarget(null);
      notify(
        `Se exportó ${exportTarget.record.id} como ${format === "md" ? "Markdown" : format.toUpperCase()}.`,
      );
    } catch (cause) {
      notify(
        cause instanceof Error
          ? `No se pudo exportar el registro: ${cause.message}`
          : "No se pudo exportar el registro.",
      );
    } finally {
      setExportingRecord(false);
    }
  }
  function saveDefaultCounts(defaults: CaseCountDefaults) {
    saveCaseCountDefaults(user.id, defaults);
    setCaseCountDefaults(defaults);
  }
  async function changeBugStatus(bug: Bug, status: BugStatus) {
    if (!bug.projectId || updatingStatus) return;
    setUpdatingStatus(bug.id);
    try {
      const updated = await saveBugStatus(bug.id, bug.projectId, status);
      setData((current) => ({
        ...current,
        bugs: current.bugs.map((item) => (item.id === updated.id ? updated : item)),
      }));
      notify(`Estado de ${bug.id} actualizado.`);
    } catch (cause) {
      notify(
        cause instanceof Error
          ? `No se pudo actualizar ${bug.id}: ${cause.message}`
          : `No se pudo actualizar ${bug.id}.`,
      );
    } finally {
      setUpdatingStatus("");
    }
  }
  async function changeCaseStatus(testCase: TestCase, status: CaseStatus) {
    if (!testCase.projectId || updatingStatus) return;
    setUpdatingStatus(testCase.id);
    try {
      const updated = await saveCaseStatus(testCase.id, testCase.projectId, status);
      setData((current) => ({
        ...current,
        cases: current.cases.map((item) => (item.id === updated.id ? updated : item)),
      }));
      notify(`Estado de ${testCase.id} actualizado.`);
    } catch (cause) {
      notify(
        cause instanceof Error
          ? `No se pudo actualizar ${testCase.id}: ${cause.message}`
          : `No se pudo actualizar ${testCase.id}.`,
      );
    } finally {
      setUpdatingStatus("");
    }
  }
  async function removeCase() {
    if (!deleteCaseTarget?.projectId || deleteCaseBusy) return;
    setDeleteCaseBusy(true);
    setDeleteCaseError("");
    try {
      await deleteTestCase(deleteCaseTarget.id, deleteCaseTarget.projectId);
      setDeleteCaseTarget(null);
      setExportTarget(null);
      setDetail(null);
      setRevision((n) => n + 1);
      notify(`Se eliminó el caso ${deleteCaseTarget.id}.`);
    } catch (cause) {
      setDeleteCaseError(cause instanceof Error ? cause.message : "No se pudo eliminar el caso.");
    } finally {
      setDeleteCaseBusy(false);
    }
  }
  const filters =
    activePage === "bugs"
      ? ["Todos", ...bugStatuses]
      : activePage === "cases"
        ? ["Todos", ...caseStatuses]
        : activePage === "runs"
          ? ["Todos", "En curso", "Completado"]
          : [];
  const isListing = ["bugs", "cases", "runs", "evidence"].includes(activePage);
  const total =
    activePage === "bugs"
      ? visibleBugs.length
      : activePage === "cases"
        ? visibleCases.length
        : activePage === "runs"
          ? visibleRuns.length
          : visibleEvidence.length;
  return (
    <div className="app-shell workspace">
      <aside className={`sidebar${mobileNav ? " sidebar-open" : ""}`}>
        <div className="brand">
          <img className="brand__icon" src="/favicon.svg" width="25" height="25" alt="" />
          <span>
            qaTest<span className="brand-light">GE</span>
          </span>
          <button
            className="mobile-close icon-button"
            onClick={() => setMobileNav(false)}
            aria-label="Cerrar menú"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="workspace__identity">
          <strong>{project?.name ?? "Tu workspace"}</strong>
          <small>Cuenta de {user.name}</small>
        </div>
        <div className="sidebar-nav">
          {navigation.map((group) => (
            <div className="nav-group" key={group.section}>
              <div className="nav-label">{group.section}</div>
              {group.items.map((item) => (
                <button
                  className={`nav-item${activePage === item.id ? " nav-active" : ""}`}
                  key={item.id}
                  onClick={() => navigate(item.id)}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                  {item.id === "bugs" && <span className="nav-count">{bugs.length}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <a className="portal-docs__link" href="/api/docs/" target="_blank" rel="noreferrer">
          <Icon name="file" />
          SwaggerUI · API ↗
        </a>
        <div className="sidebar-bottom">
          <div className="workspace__identity">
            <Avatar initials={user.name.slice(0, 2).toUpperCase()} color="orange" />
            <strong>{user.name}</strong>
            <small>Sesión activa</small>
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button className="scrim" aria-label="Cerrar menú" onClick={() => setMobileNav(false)} />
      )}
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileNav(true)}
              aria-label="Abrir menú"
            >
              <span className="hamburger" />
            </button>
            <span>{project?.name ?? "Workspace"}</span>
            <span className="crumb-slash">/</span>
            <strong>{pageTitle}</strong>
          </div>
          <div className="topbar-actions">
            {themeControl}
            <button className="session__logout" onClick={onLogout}>
              Salir
            </button>
            <span className="ai-pill">
              <Icon name="sparkle" size={15} /> IA no conectada
            </span>
          </div>
        </header>
        <div className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">
                {new Date().toLocaleDateString("es", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <h1>{activePage === "overview" ? `Hola, ${user.name}` : pageTitle}</h1>
              <p className="page-subtitle">{pageDescription(activePage)}</p>
            </div>
            {!["case-builder", "settings"].includes(activePage) && (
              <button
                disabled={!projectId || loading || saving || Boolean(error)}
                className="button button-primary"
                onClick={() =>
                  openModal(
                    activePage === "cases"
                      ? "case"
                      : activePage === "runs"
                        ? "run"
                        : activePage === "evidence"
                          ? "evidence"
                          : "bug",
                  )
                }
              >
                <Icon name="plus" />
                {activePage === "cases"
                  ? "Nuevo caso de prueba"
                  : activePage === "runs"
                    ? "Nueva ejecución"
                    : activePage === "evidence"
                      ? "Registrar metadatos"
                      : "Nuevo bug"}
              </button>
            )}
          </div>
          <div className="workspace__toolbar">
            <label>
              Proyecto
              <select
                disabled={saving}
                value={projectId}
                onChange={(event) => {
                  setData({ bugs: [], cases: [], runs: [], evidence: [] });
                  setLoading(true);
                  setProjectId(event.target.value);
                }}
              >
                <option value="" disabled>
                  Selecciona un proyecto
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · #{p.id}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="workspace__secondary"
              disabled={loading || saving}
              onClick={() => {
                setError("");
                setLoading(true);
                setRevision((n) => n + 1);
              }}
            >
              Actualizar
            </button>
          </div>
          {loading && (
            <p className="workspace__notice" role="status">
              Cargando datos del proyecto…
            </p>
          )}
          {error && (
            <p className="workspace__error" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && !projectId && (
            <p className="workspace__notice">
              No tienes proyectos disponibles. El administrador debe conceder acceso a un espacio
              existente.
            </p>
          )}
          {activePage === "settings" ? (
            <AccountSettingsView
              user={user}
              onUserUpdated={onUserUpdated}
              onAccountDeleted={onAccountDeleted}
              caseCountDefaults={caseCountDefaults}
              onCaseCountDefaultsChanged={saveDefaultCounts}
            />
          ) : activePage === "case-builder" ? (
            <CaseBuilder defaultCounts={caseCountDefaults} projectId={projectId} />
          ) : (
            !loading &&
            !error &&
            projectId &&
            (activePage === "overview" ? (
              <>
                <div className="workspace__metrics">
                  {[
                    ["Bugs abiertos", bugs.filter((b) => b.status !== "Resuelto").length],
                    ["Casos de prueba", cases.length],
                    ["Ejecuciones activas", runs.filter((r) => r.status === "En curso").length],
                    ["Evidencias", evidence.length],
                  ].map(([label, value]) => (
                    <div className="workspace__metric" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                      <small>Proyecto actual · PostgreSQL</small>
                    </div>
                  ))}
                </div>
                <section className="workspace__panel">
                  <h2>Bugs recientes</h2>
                  <BugTable
                    bugs={bugs.slice(0, 5)}
                    onSelect={setDetail}
                    onExport={(bug) => setExportTarget({ kind: "bug", record: bug })}
                    onStatusChange={changeBugStatus}
                    updatingStatus={updatingStatus}
                  />
                  {!bugs.length && (
                    <p className="workspace__notice">Aún no hay bugs en este proyecto.</p>
                  )}
                </section>
                <section className="workspace__panel">
                  <h2>Ejecuciones recientes</h2>
                  <RunTable items={runs.slice(0, 5)} onSelect={setDetail} />
                  {!runs.length && (
                    <p className="workspace__notice">
                      Aún no hay ejecuciones. Crea casos y agrúpalos en una ejecución.
                    </p>
                  )}
                </section>
              </>
            ) : isListing ? (
              <section className="listing-card">
                <div className="listing-toolbar">
                  <div className="listing-tabs">
                    {filters.map((filter) => (
                      <button
                        key={filter}
                        className={`filter-tab${statusFilter === filter ? " filter-tab-active" : ""}`}
                        onClick={() => setStatusFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <label className="search-field">
                    <Icon name="search" />
                    <input
                      aria-label="Buscar registros"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={`Buscar ${pageTitle.toLowerCase()}…`}
                    />
                  </label>
                </div>
                {activePage === "bugs" && (
                  <BugTable
                    bugs={visibleBugs}
                    onSelect={setDetail}
                    onExport={(bug) => setExportTarget({ kind: "bug", record: bug })}
                    onStatusChange={changeBugStatus}
                    updatingStatus={updatingStatus}
                  />
                )}
                {activePage === "cases" && (
                  <CaseTable
                    items={visibleCases}
                    onSelect={setDetail}
                    onExport={(item) => setExportTarget({ kind: "case", record: item })}
                    onStatusChange={changeCaseStatus}
                    updatingStatus={updatingStatus}
                  />
                )}
                {activePage === "runs" && <RunTable items={visibleRuns} onSelect={setDetail} />}
                {activePage === "evidence" && (
                  <EvidenceTable items={visibleEvidence} onSelect={setDetail} />
                )}
                {!total && (
                  <p className="workspace__notice">
                    No hay registros que coincidan con los filtros.
                  </p>
                )}
                <div className="table-footer">
                  <span>{total} resultados · datos del proyecto</span>
                </div>
              </section>
            ) : null)
          )}
          <footer className="page-footer">
            <span>© {new Date().getFullYear()} qaTestGE</span>
            <span>
              {error
                ? "Datos no disponibles"
                : loading
                  ? "Actualizando datos…"
                  : "Datos persistidos en PostgreSQL"}
            </span>
          </footer>
        </div>
      </main>
      {modal && (
        <Dialog
          wide
          title={
            modal === "bug"
              ? "Nuevo bug"
              : modal === "case"
                ? "Nuevo caso de prueba"
                : modal === "edit-case"
                  ? `Editar ${editingCase?.id ?? "caso"}`
                  : modal === "run"
                    ? "Nueva ejecución"
                    : "Registrar metadatos"
          }
          onClose={() => {
            if (!saving) {
              setModal("");
              setEditingCase(null);
            }
          }}
        >
          <form
            key={modal}
            className="workspace__form"
            onSubmit={(event) => void save(event)}
            aria-busy={saving}
          >
            <fieldset disabled={saving} className="workspace__fieldset">
              <label className="workspace__field">
                Proyecto
                <input value={project?.name ?? ""} readOnly />
              </label>
              {modal === "bug" && (
                <label className="workspace__field">
                  Cargar plantilla
                  {bugTemplatesLoading ? (
                    <span className="workspace__notice">Cargando plantillas…</span>
                  ) : (
                    <select
                      value={selectedBugTemplateId}
                      onChange={(event) => applyBugTemplate(event.target.value)}
                    >
                      <option value="">Sin plantilla</option>
                      {bugTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              )}
              {modal !== "evidence" && (
                <label className="workspace__field">
                  Título
                  {modal === "bug" ? (
                    <input
                      name="title"
                      value={bugForm.title}
                      onChange={(event) => setBugForm({ ...bugForm, title: event.target.value })}
                      maxLength={200}
                      required
                    />
                  ) : (
                    <input
                      name="title"
                      maxLength={200}
                      defaultValue={editingCase?.title ?? ""}
                      required
                    />
                  )}
                </label>
              )}
              {modal === "bug" && (
                <>
                  {bugTemplatesError && (
                    <p className="workspace__error" role="alert">
                      {bugTemplatesError}
                    </p>
                  )}
                  <label className="workspace__field">
                    Descripción
                    <textarea
                      name="description"
                      value={bugForm.description}
                      onChange={(event) =>
                        setBugForm({ ...bugForm, description: event.target.value })
                      }
                      maxLength={5000}
                      rows={6}
                    />
                  </label>
                  <label className="workspace__field">
                    Prioridad
                    <select
                      name="priority"
                      value={bugForm.priority}
                      onChange={(event) =>
                        setBugForm({
                          ...bugForm,
                          priority: event.target.value as BugTemplatePriority,
                        })
                      }
                    >
                      <option>Crítica</option>
                      <option>Alta</option>
                      <option>Media</option>
                      <option>Baja</option>
                    </select>
                  </label>
                </>
              )}
              {(modal === "case" || modal === "edit-case") && (
                <>
                  <label className="workspace__field">
                    Suite (opcional)
                    <input name="suite" maxLength={100} defaultValue={editingCase?.suite ?? ""} />
                  </label>
                  <label className="workspace__field">
                    Precondiciones
                    <textarea
                      name="preconditions"
                      maxLength={10000}
                      defaultValue={editingCase?.preconditions ?? ""}
                    />
                  </label>
                  <fieldset className="workspace__step-editor">
                    <legend>Pasos y resultados esperados · {caseSteps.length}/100</legend>
                    {caseSteps.map((step, index) => (
                      <div className="workspace__step-card" key={index}>
                        <h3>Paso {index + 1}</h3>
                        <label className="workspace__field">
                          Acción
                          <textarea
                            name="action"
                            maxLength={10000}
                            rows={3}
                            value={step.action}
                            onChange={(event) =>
                              setCaseSteps((current) =>
                                current.map((item, stepIndex) =>
                                  stepIndex === index
                                    ? { ...item, action: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <label className="workspace__field">
                          Resultado esperado
                          <textarea
                            name="expectedResult"
                            maxLength={10000}
                            rows={3}
                            value={step.expectedResult}
                            onChange={(event) =>
                              setCaseSteps((current) =>
                                current.map((item, stepIndex) =>
                                  stepIndex === index
                                    ? { ...item, expectedResult: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="workspace__secondary workspace__step-remove"
                          disabled={caseSteps.length <= 1}
                          onClick={() =>
                            setCaseSteps((steps) =>
                              steps.length <= 1
                                ? steps
                                : steps.filter((_item, stepIndex) => stepIndex !== index),
                            )
                          }
                        >
                          Eliminar paso
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="workspace__secondary"
                      disabled={caseSteps.length >= 100}
                      onClick={() =>
                        setCaseSteps((steps) =>
                          steps.length >= 100
                            ? steps
                            : [...steps, { action: "", expectedResult: "" }],
                        )
                      }
                    >
                      Añadir paso
                    </button>
                  </fieldset>
                  <label className="workspace__field">
                    Enlaces relacionados (uno por línea)
                    <textarea
                      name="attachmentLinks"
                      rows={3}
                      placeholder="https://docs.example.com/especificacion"
                    />
                  </label>
                  <div
                    className={`workspace__image-dropzone${caseImageDragging ? " workspace__image-dropzone--active" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setCaseImageDragging(true);
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget === event.target) setCaseImageDragging(false);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setCaseImageDragging(false);
                      addCaseImages(event.dataTransfer.files);
                    }}
                  >
                    <strong>Imágenes del caso</strong>
                    <span>
                      Arrastra imágenes aquí o selecciónalas desde tu dispositivo. PNG, JPEG, GIF o
                      WebP; máximo 2 MB cada una y 5 por operación.
                    </span>
                    <label className="workspace__secondary workspace__image-picker">
                      Seleccionar imágenes
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        multiple
                        onChange={(event) => {
                          if (event.target.files) addCaseImages(event.target.files);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {caseImageFiles.map((file, index) => (
                      <div
                        className="workspace__image-file"
                        key={`${file.name}:${file.lastModified}:${index}`}
                      >
                        <span>
                          {file.name} · {(file.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          className="workspace__secondary"
                          onClick={() =>
                            setCaseImageFiles((current) =>
                              current.filter((_item, fileIndex) => fileIndex !== index),
                            )
                          }
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {modal === "run" && (
                <fieldset className="workspace__fieldset">
                  <legend>Casos de este proyecto</legend>
                  {cases.map((c) => (
                    <label className="workspace__check" key={c.id}>
                      <input type="checkbox" name="caseIds" value={c.id} />
                      {c.id} · {c.title}
                    </label>
                  ))}
                  {!cases.length && (
                    <p>Crea primero tus casos de prueba o guarda una ejecución vacía.</p>
                  )}
                </fieldset>
              )}
              {modal === "evidence" && (
                <>
                  <p className="workspace__notice">
                    Solo se guardarán nombre, tipo, tamaño y vínculo. El contenido del archivo no se
                    sube.
                  </p>
                  <label className="workspace__field">
                    Archivo
                    <input name="file" type="file" required />
                  </label>
                  <label className="workspace__field">
                    Vincular a
                    <select name="related">
                      <option value="">Sin vincular</option>
                      {[...bugs, ...cases, ...runs].map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.id} · {item.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </fieldset>
            {formError && (
              <p className="workspace__error" role="alert">
                {formError}
              </p>
            )}
            <div className="workspace__actions">
              <button
                type="button"
                className="workspace__secondary"
                disabled={saving}
                onClick={() => {
                  setModal("");
                  setEditingCase(null);
                }}
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="button button-primary">
                {saving ? "Guardando…" : modal === "edit-case" ? "Guardar cambios" : "Guardar"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {detail && (
        <Dialog wide title="Detalle del registro" onClose={() => setDetail(null)}>
          <dl className="workspace__detail">
            {Object.entries(detail)
              .filter(([key]) => !["color", "updated", "date", "cases", "size"].includes(key))
              .map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt>
                    {(
                      {
                        title: "Título",
                        description: "Descripción",
                        status: "Estado",
                        project: "Proyecto",
                        projectId: "ID de proyecto",
                        priority: "Prioridad",
                        assignee: "Responsable",
                        suite: "Suite",
                        preconditions: "Precondiciones",
                        steps: "Pasos",
                        owner: "Responsable",
                        caseIds: "Casos",
                        caseCount: "Cantidad de casos",
                        progress: "Progreso",
                        name: "Nombre",
                        type: "Tipo",
                        related: "Vinculado a",
                        sizeBytes: "Tamaño en bytes",
                        createdAt: "Creación",
                      } as Record<string, string>
                    )[key] ?? key}
                  </dt>
                  <dd>
                    {typeof value === "object" ? (
                      <pre>{JSON.stringify(value, null, 2)}</pre>
                    ) : (
                      String(value ?? "—")
                    )}
                  </dd>
                </React.Fragment>
              ))}
          </dl>
          {isTestCaseRecord(detail) && <CaseAttachmentsPanel testCase={detail} />}
        </Dialog>
      )}
      {exportTarget && (
        <Dialog
          title={`${exportTarget.kind === "case" ? "Acciones" : "Exportar"} ${exportTarget.record.id}`}
          onClose={() => {
            if (!exportingRecord) setExportTarget(null);
          }}
        >
          <p className="workspace__notice">
            Elige un formato para exportar este registro y todos sus pasos/resultados.
          </p>
          <div className="workspace__export-options">
            {recordExportFormats.map((format) => (
              <button
                className="workspace__export-option"
                type="button"
                key={format}
                disabled={exportingRecord}
                onClick={() => void exportSelectedRecord(format)}
              >
                {exportingRecord
                  ? "Preparando…"
                  : format === "pdf"
                    ? "Exportar como PDF"
                    : format === "xlsx"
                      ? "Exportar como Excel"
                      : "Exportar como Markdown"}
              </button>
            ))}
          </div>
          {exportTarget.kind === "case" && (
            <div className="workspace__case-actions">
              <button
                type="button"
                className="workspace__secondary"
                disabled={!exportTarget.record.projectId}
                onClick={() => editCase(exportTarget.record as TestCase)}
              >
                Editar caso de prueba
              </button>
              <button
                type="button"
                className="workspace__danger"
                disabled={!exportTarget.record.projectId}
                onClick={() => {
                  setDeleteCaseTarget(exportTarget.record as TestCase);
                  setDeleteCaseError("");
                  setExportTarget(null);
                }}
              >
                Eliminar caso de prueba
              </button>
            </div>
          )}
        </Dialog>
      )}
      {deleteCaseTarget && (
        <Dialog
          title={`Eliminar ${deleteCaseTarget.id}`}
          onClose={() => {
            if (!deleteCaseBusy) {
              setDeleteCaseTarget(null);
              setDeleteCaseError("");
            }
          }}
        >
          <p className="workspace__notice">
            Esta acción elimina el caso y sus adjuntos. No se puede borrar si otras relaciones, como
            una ejecución, hacen referencia a él.
          </p>
          {deleteCaseError && (
            <p className="workspace__error" role="alert">
              {deleteCaseError}
            </p>
          )}
          <div className="workspace__actions">
            <button
              type="button"
              className="workspace__secondary"
              disabled={deleteCaseBusy}
              onClick={() => {
                setDeleteCaseTarget(null);
                setDeleteCaseError("");
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="workspace__danger"
              disabled={deleteCaseBusy}
              onClick={() => void removeCase()}
            >
              {deleteCaseBusy ? "Eliminando…" : "Eliminar caso"}
            </button>
          </div>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function pageDescription(page: NavigationPage): string {
  return {
    overview: "Aquí tienes el estado de calidad de tus proyectos.",
    bugs: "Registra, prioriza y da seguimiento a las incidencias de tus proyectos.",
    cases: "Organiza los escenarios que mantienen tu producto bajo control.",
    runs: "Ejecuta suites de prueba y consulta sus resultados.",
    evidence: "Capturas, videos y archivos vinculados a tu actividad de QA.",
    settings: "Preferencias del workspace y de tu perfil.",
    "case-builder": "De una idea a un plan de pruebas: explora la maqueta del futuro asistente.",
  }[page];
}

function StatusControl<TStatus extends string>({
  status,
  statuses,
  disabled,
  label,
  onChange,
}: {
  status: TStatus;
  statuses: readonly TStatus[];
  disabled: boolean;
  label: string;
  onChange: (status: TStatus) => void;
}) {
  return (
    <select
      className={`workspace__status-select workspace__status-select--${status.toLowerCase().replaceAll(" ", "-")}`}
      aria-label={`Cambiar estado de ${label}`}
      value={status}
      disabled={disabled}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.value as TStatus)}
    >
      {statuses.map((value) => (
        <option key={value} value={value}>
          {value}
        </option>
      ))}
    </select>
  );
}

function BugTable({
  bugs,
  onSelect,
  onExport,
  onStatusChange,
  updatingStatus,
  compact = false,
}: {
  bugs: Bug[];
  onSelect: (bug: Bug) => void;
  onExport: (bug: Bug) => void;
  onStatusChange: (bug: Bug, status: BugStatus) => void;
  updatingStatus: string;
  compact?: boolean;
}) {
  return (
    <div className={`table-scroll${compact ? " table-compact" : ""}`}>
      <table>
        <thead>
          <tr>
            <th>BUG ID</th>
            <th>TÍTULO</th>
            <th>PRIORIDAD</th>
            <th>ESTADO</th>
            <th>ASIGNADO</th>
            <th>CREADO</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {bugs.map((bug) => (
            <tr key={bug.id} onClick={() => onSelect(bug)}>
              <td>
                <span className="id-text">{bug.id}</span>
              </td>
              <td>
                <span className="bug-title">{bug.title}</span>
                <span className="table-project">{bug.project}</span>
              </td>
              <td>
                <Priority level={bug.priority} />
              </td>
              <td>
                {" "}
                <StatusControl
                  label={bug.id}
                  status={bug.status}
                  statuses={bugStatuses}
                  disabled={Boolean(updatingStatus)}
                  onChange={(status) => onStatusChange(bug, status)}
                />
              </td>
              <td>
                <span className="assignee">
                  <Avatar initials={bug.assignee} color={bug.color} small />
                  <span>{bug.assignee}</span>
                </span>
              </td>
              <td className="muted-cell">{bug.updated}</td>
              <td>
                <button
                  className="row-more"
                  aria-label={`Exportar ${bug.id}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onExport(bug);
                  }}
                >
                  <Icon name="dots" size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CaseTable({
  items,
  onSelect,
  onExport,
  onStatusChange,
  updatingStatus,
}: {
  items: TestCase[];
  onSelect: (item: TestCase) => void;
  onExport: (item: TestCase) => void;
  onStatusChange: (item: TestCase, status: CaseStatus) => void;
  updatingStatus: string;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>CASO ID</th>
            <th>NOMBRE DEL CASO</th>
            <th>SUITE</th>
            <th>ESTADO</th>
            <th>CREADO</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} onClick={() => onSelect(item)}>
              <td>
                <span className="id-text">{item.id}</span>
              </td>
              <td>
                <span className="bug-title">{item.title}</span>
              </td>
              <td>
                <span className="suite-badge">{item.suite || "—"}</span>
              </td>
              <td>
                <StatusControl
                  label={item.id}
                  status={item.status}
                  statuses={caseStatuses}
                  disabled={Boolean(updatingStatus)}
                  onChange={(status) => onStatusChange(item, status)}
                />
              </td>
              <td className="muted-cell">{item.updated}</td>
              <td>
                <button
                  className="row-more"
                  aria-label={`Exportar ${item.id}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onExport(item);
                  }}
                >
                  <Icon name="dots" size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RunTable({ items, onSelect }: { items: TestRun[]; onSelect: (item: TestRun) => void }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>RUN ID</th>
            <th>NOMBRE DE EJECUCIÓN</th>
            <th>CASOS</th>
            <th>PROGRESO</th>
            <th>ESTADO</th>
            <th>RESPONSABLE</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} onClick={() => onSelect(item)}>
              <td>
                <span className="id-text">{item.id}</span>
              </td>
              <td>
                <span className="bug-title">{item.title}</span>
              </td>
              <td className="muted-cell">{item.cases}</td>
              <td>
                <div className="table-progress">
                  <span>
                    <i style={{ width: `${item.progress}%` }} />
                  </span>
                  {item.progress}%
                </div>
              </td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td className="muted-cell">{item.owner}</td>
              <td>
                <button className="row-more" aria-label={`Más opciones para ${item.id}`}>
                  <Icon name="dots" size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvidenceTable({
  items,
  onSelect,
}: {
  items: Evidence[];
  onSelect: (item: Evidence) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>NOMBRE</th>
            <th>TIPO</th>
            <th>VINCULADO A</th>
            <th>TAMAÑO</th>
            <th>FECHA</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} onClick={() => onSelect(item)}>
              <td>
                <span className="evidence-name">
                  <span className="evidence-file">
                    <Icon name="file" size={17} />
                  </span>
                  <span className="bug-title">{item.name}</span>
                </span>
              </td>
              <td>
                <span className="suite-badge">{item.type}</span>
              </td>
              <td>
                <span className="id-text">{item.related}</span>
              </td>
              <td className="muted-cell">{item.size}</td>
              <td className="muted-cell">{item.date}</td>
              <td>
                <button className="row-more" aria-label={`Más opciones para ${item.name}`}>
                  <Icon name="dots" size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
