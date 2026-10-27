import TestRunDialog from "./views/TestRunDialog";
import { version } from "../package.json";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, SVGProps } from "react";
import Alert, { type AlertTone } from "./Alert";
import { filterBugs, filterCases, filterEvidence, filterRuns } from "./utils/filterItems";
import CaseBuilder from "./CaseBuilder";
import Dialog from "./Dialog";
import {
  addTestCaseLink,
  api,
  createBug,
  deleteBug,
  listTags,
  deleteEvidence,
  downloadEvidenceFile,
  deleteTestCase,
  deleteTestCaseAttachment,
  listTestCaseAttachments,
  loadProject,
  saveBugStatus,
  saveCaseStatus,
  testCaseImageUrl,
  updateBug,
  updateEvidence,
  updateTestCase,
  uploadEvidenceFile,
  uploadTestCaseImage,
} from "./api";
import type { BugTemplate, BugTemplatePriority, Project, User } from "./api";
import AccountSettingsView from "./views/AccountSettingsView";
import WikiView from "./views/WikiView";
import TagsView from "./views/TagsView";
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
  Tag,
} from "./types";
import { bugStatuses, caseStatuses } from "./types";
import {
  loadCaseCountDefaults,
  loadSelectedCategories,
  saveCaseCountDefaults,
  saveSelectedCategories,
  type CaseCountDefaults,
} from "./models/caseCountDefaults";

const navigation: {
  section: string;
  items: { id: NavigationPage; label: string; icon: IconName; count?: string }[];
}[] = [
  {
    section: "WORKSPACE",
    items: [
      { id: "overview", label: "Dashboard", icon: "grid" },
      { id: "bugs", label: "Bugs", icon: "bug", count: undefined },
      { id: "cases", label: "Casos de prueba", icon: "check-square" },
      { id: "case-builder", label: "Diseñar test cases", icon: "sparkle" },
      { id: "runs", label: "Test runs", icon: "play" },
      { id: "evidence", label: "Evidencias", icon: "image" },
      { id: "tags", label: "Tags", icon: "tag" },
      { id: "wiki", label: "Wiki", icon: "file" },
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
    tag: (
      <>
        <path d="M20 13 13 20 3 10V4h6l11 9Z" />
        <circle cx="7.5" cy="7.5" r="1" />
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
      {attachmentError && <Alert tone="error">{attachmentError}</Alert>}
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
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagError, setTagError] = useState("");
  const [data, setData] = useState<WorkspaceData>({ bugs: [], cases: [], runs: [], evidence: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState("");
  const [caseCountDefaults, setCaseCountDefaults] = useState<CaseCountDefaults>(() =>
    loadCaseCountDefaults(user.id),
  );
  const [caseDesignCategories, setCaseDesignCategories] = useState<string[]>(() =>
    loadSelectedCategories(user.id),
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
    status: BugStatus;
    assignee: string;
  }>({ title: "", description: "", priority: "Media", status: "Abierto", assignee: "" });
  const [editingBug, setEditingBug] = useState<Bug | null>(null);
  const [deleteBugTarget, setDeleteBugTarget] = useState<Bug | null>(null);
  const [deleteBugError, setDeleteBugError] = useState("");
  const [deleteBugBusy, setDeleteBugBusy] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
  const [evidenceActionTarget, setEvidenceActionTarget] = useState<Evidence | null>(null);
  const [evidenceToDelete, setEvidenceToDelete] = useState<Evidence | null>(null);
  const [evidenceForm, setEvidenceForm] = useState({
    name: "",
    type: "Archivo" as Evidence["type"],
    sizeBytes: 0,
    related: "",
  });
  const [evidenceRelatedChanged, setEvidenceRelatedChanged] = useState(false);
  const [caseSteps, setCaseSteps] = useState([{ action: "", expectedResult: "" }]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
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
  const [toastTone, setToastTone] = useState<AlertTone>("success");
  const [runDetail, setRunDetail] = useState<TestRun | null>(null);
  const [runAction, setRunAction] = useState<"view" | "edit" | "delete">("view");
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
  useEffect(() => {
    if (!projectId) {
      setTags([]);
      return;
    }
    const abort = new AbortController();
    setTagError("");
    void listTags(projectId)
      .then((items) => {
        if (!abort.signal.aborted) setTags(items);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted) {
          setTags([]);
          setTagError(cause instanceof Error ? cause.message : "No se pudieron cargar los tags.");
        }
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
    overview: "Dashboard",
    bugs: "Bugs",
    cases: "Casos de prueba",
    runs: "Test runs",
    evidence: "Evidencias",
    tags: "Tags",
    settings: "Configuración",
    wiki: "Wiki",
    "case-builder": "Diseñar test cases",
  }[activePage];
  const notify = (message: string, tone: AlertTone = "success") => {
    clearTimeout(toastTimer.current);
    setToastTone(tone);
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
    setEditingBug(null);
    setEditingEvidence(null);
    setEditingCase(null);
    setCaseImageFiles([]);
    setCaseImageDragging(false);
    if (value === "bug") {
      setBugForm({
        title: "",
        description: "",
        priority: "Media",
        status: "Abierto",
        assignee: "",
      });
      setSelectedBugTemplateId("");
    }
    if (value === "case") setCaseSteps([{ action: "", expectedResult: "" }]);
    setSelectedTagIds([]);
    if (value === "evidence") {
      setEvidenceForm({ name: "", type: "Archivo", sizeBytes: 0, related: "" });
      setEvidenceRelatedChanged(false);
    }
    setModal(value);
  }
  function editBug(bug: Bug) {
    setBugForm({
      title: bug.title,
      description: bug.description ?? "",
      priority: bug.priority,
      status: bug.status,
      assignee: bug.assignee === "—" ? "" : bug.assignee,
    });
    setEditingBug(bug);
    setSelectedTagIds(bug.tagIds ?? []);
    setSelectedBugTemplateId("");
    setRecordDetail(null);
    setFormError("");
    setModal("edit-bug");
  }
  function editEvidence(evidenceRecord: Evidence) {
    setEditingEvidence(evidenceRecord);
    setEvidenceForm({
      name: evidenceRecord.name,
      type: evidenceRecord.type,
      sizeBytes: evidenceRecord.sizeBytes,
      related:
        evidenceRecord.related === "Sin vincular" ? "" : evidenceRecord.related.split(", ")[0],
    });
    setEvidenceRelatedChanged(false);
    setEvidenceActionTarget(null);
    setFormError("");
    setModal("edit-evidence");
  }
  async function removeEvidence() {
    if (!evidenceToDelete || saving) return;
    setSaving(true);
    setFormError("");
    try {
      await deleteEvidence(evidenceToDelete.id, projectId);
      setEvidenceToDelete(null);
      setRevision((current) => current + 1);
      notify("Evidencia eliminada.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "No se pudo eliminar la evidencia.");
    } finally {
      setSaving(false);
    }
  }
  async function downloadEvidence(item: Evidence) {
    try {
      await downloadEvidenceFile(item.id, item.projectId, item.name);
      notify(`Descargando ${item.name}.`);
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "No se pudo descargar el archivo.", "error");
    }
  }
  function editCase(testCase: TestCase) {
    setRecordDetail(null);
    setFormError("");
    setCaseImageFiles([]);
    setEditingCase(testCase);
    setSelectedTagIds(testCase.tagIds ?? []);
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
        ? {
            title: template.title,
            description: template.description,
            priority: template.priority,
            status: "Abierto",
            assignee: "",
          }
        : { title: "", description: "", priority: "Media", status: "Abierto", assignee: "" },
    );
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || saving) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (modal === "edit-bug") {
      if (!editingBug) return;
      setSaving(true);
      setFormError("");
      try {
        await updateBug(editingBug.id, projectId, {
          title,
          description: bugForm.description,
          priority: bugForm.priority,
          status: bugForm.status,
          assignee: bugForm.assignee.trim() || null,
          tagIds: selectedTagIds,
        });
        setModal("");
        setEditingBug(null);
        setRevision((current) => current + 1);
        setActivePage("bugs");
        notify("Bug actualizado.");
      } catch (cause) {
        setFormError(cause instanceof Error ? cause.message : "No se pudo actualizar el bug.");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (modal === "upload-evidence") {
      if (!editingEvidence) return;
      const file = form.get("file");
      if (!(file instanceof File) || !file.name || file.size < 1 || file.size > 2 * 1024 * 1024) {
        setFormError("Selecciona un archivo válido de hasta 2 MiB.");
        return;
      }
      setSaving(true);
      setFormError("");
      try {
        await uploadEvidenceFile(editingEvidence.id, projectId, file);
        setModal("");
        setEditingEvidence(null);
        setRevision((current) => current + 1);
        setActivePage("evidence");
        notify("Archivo de evidencia guardado.");
      } catch (cause) {
        setFormError(cause instanceof Error ? cause.message : "No se pudo subir el archivo.");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (modal === "edit-evidence") {
      if (!editingEvidence) return;
      if (!Number.isSafeInteger(evidenceForm.sizeBytes) || evidenceForm.sizeBytes < 0) {
        setFormError("El tamaño debe ser un número entero no negativo.");
        return;
      }
      setSaving(true);
      setFormError("");
      try {
        await updateEvidence(editingEvidence.id, projectId, {
          name: evidenceForm.name.trim(),
          type: evidenceForm.type,
          sizeBytes: evidenceForm.sizeBytes,
          ...(evidenceRelatedChanged ? { related: evidenceForm.related || null } : {}),
        });
        setModal("");
        setEditingEvidence(null);
        setRevision((current) => current + 1);
        setActivePage("evidence");
        notify("Metadatos de evidencia actualizados.");
      } catch (cause) {
        setFormError(
          cause instanceof Error ? cause.message : "No se pudieron actualizar los metadatos.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }
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
        tagIds: selectedTagIds,
      };
      body = { projectId, ...caseInput };
    } else if (modal === "run") {
      path = "/test-runs";
      body = {
        projectId,
        title,
        owner: user.name,
        caseIds: form.getAll("caseIds"),
        tagIds: selectedTagIds,
      };
    } else if (modal === "evidence") {
      path = "/evidence";
      const file = form.get("file");
      if (!(file instanceof File) || !file.name || file.size < 1 || file.size > 2 * 1024 * 1024) {
        setFormError("Selecciona un archivo válido de hasta 2 MiB.");
        return;
      }
      body = {
        projectId,
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
      if (modal === "bug") {
        await createBug({
          projectId,
          title,
          description: bugForm.description,
          priority: bugForm.priority,
          assignee: bugForm.assignee.trim() || null,
          tagIds: selectedTagIds,
        });
      } else if (modal === "evidence") {
        const file = form.get("file");
        if (!(file instanceof File)) throw new Error("Selecciona un archivo de evidencia.");
        await uploadEvidenceFile(
          null,
          projectId,
          file,
          typeof body.related === "string" ? body.related : null,
        );
      } else {
        await api(path, { method: "POST", body: JSON.stringify(body) });
      }
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
          : modal === "evidence"
            ? "Archivo guardado en PostgreSQL."
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
        "error",
      );
    } finally {
      setExportingRecord(false);
    }
  }
  function saveDefaultCounts(defaults: CaseCountDefaults) {
    saveCaseCountDefaults(user.id, defaults);
    setCaseCountDefaults(defaults);
  }
  function saveDefaultCategories(selected: string[]) {
    saveSelectedCategories(user.id, selected);
    setCaseDesignCategories(selected);
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
        "error",
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
        "error",
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
  async function removeBug() {
    if (!deleteBugTarget?.projectId || deleteBugBusy) return;
    setDeleteBugBusy(true);
    setDeleteBugError("");
    try {
      await deleteBug(deleteBugTarget.id, deleteBugTarget.projectId);
      setDeleteBugTarget(null);
      setRevision((n) => n + 1);
      notify(`Se eliminó el bug ${deleteBugTarget.id}.`);
    } catch (cause) {
      setDeleteBugError(cause instanceof Error ? cause.message : "No se pudo eliminar el bug.");
    } finally {
      setDeleteBugBusy(false);
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
              className="workspace__menu-toggle icon-button"
              onClick={() => setMobileNav(true)}
              aria-label="Abrir menú"
              aria-expanded={mobileNav}
            >
              <svg
                className="workspace__menu-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
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
              <h1>{pageTitle}</h1>
              <p className="page-subtitle">{pageDescription(activePage)}</p>
            </div>
            {!["overview", "case-builder", "settings", "tags", "wiki"].includes(activePage) && (
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
          {error && <Alert tone="error">{error}</Alert>}
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
              selectedCategories={caseDesignCategories}
              onSelectedCategoriesChanged={saveDefaultCategories}
            />
          ) : activePage === "wiki" ? (
            <WikiView />
          ) : activePage === "case-builder" ? (
            <CaseBuilder
              defaultCounts={caseCountDefaults}
              defaultSelectedCategories={caseDesignCategories}
              projectId={projectId}
            />
          ) : activePage === "tags" ? (
            !loading &&
            projectId && (
              <>
                {tagError ? (
                  <Alert tone="error">{tagError}</Alert>
                ) : error ? (
                  <Alert tone="error">{error}</Alert>
                ) : (
                  <TagsView
                    projectId={projectId}
                    tags={tags}
                    onChanged={() => setRevision((current) => current + 1)}
                  />
                )}
              </>
            )
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
                    tags={tags}
                    onSelect={(bug) => setRecordDetail({ kind: "bug", record: bug })}
                    onExport={(bug) => setExportTarget({ kind: "bug", record: bug })}
                    onEdit={editBug}
                    onDelete={(bug) => {
                      setDeleteBugError("");
                      setDeleteBugTarget(bug);
                    }}
                    onStatusChange={changeBugStatus}
                    updatingStatus={updatingStatus}
                  />
                  {!bugs.length && (
                    <p className="workspace__notice">Aún no hay bugs en este proyecto.</p>
                  )}
                </section>
                <section className="workspace__panel">
                  <h2>Ejecuciones recientes</h2>
                  <RunTable
                    items={runs.slice(0, 5)}
                    tags={tags}
                    onSelect={(run, action) => {
                      setRunAction(action);
                      setRunDetail(run);
                    }}
                  />
                  {!runs.length && (
                    <p className="workspace__notice">
                      Aún no hay ejecuciones. Crea casos y agrúpalos en una ejecución.
                    </p>
                  )}
                </section>
              </>
            ) : isListing ? (
              <section className="listing-card">
                <div className="listing-toolbar listing-filters">
                  <div className="listing-filters__tabs">
                    {filters.map((filter) => (
                      <button
                        key={filter}
                        className={`listing-filters__tab${statusFilter === filter ? " listing-filters__tab--active" : ""}`}
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
                    tags={tags}
                    onSelect={(bug) => setRecordDetail({ kind: "bug", record: bug })}
                    onExport={(bug) => setExportTarget({ kind: "bug", record: bug })}
                    onEdit={editBug}
                    onDelete={(bug) => {
                      setDeleteBugError("");
                      setDeleteBugTarget(bug);
                    }}
                    onStatusChange={changeBugStatus}
                    updatingStatus={updatingStatus}
                  />
                )}
                {activePage === "cases" && (
                  <CaseTable
                    items={visibleCases}
                    tags={tags}
                    onSelect={(testCase) => setRecordDetail({ kind: "case", record: testCase })}
                    onExport={(item) => setExportTarget({ kind: "case", record: item })}
                    onEdit={editCase}
                    onDelete={(item) => {
                      setDeleteCaseError("");
                      setDeleteCaseTarget(item);
                    }}
                    onStatusChange={changeCaseStatus}
                    updatingStatus={updatingStatus}
                  />
                )}
                {activePage === "runs" && (
                  <RunTable
                    items={visibleRuns}
                    tags={tags}
                    onSelect={(run, action) => {
                      setRunAction(action);
                      setRunDetail(run);
                    }}
                  />
                )}
                {activePage === "evidence" && (
                  <EvidenceTable
                    items={visibleEvidence}
                    onSelect={setDetail}
                    onActions={setEvidenceActionTarget}
                  />
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
            <span>
              © {new Date().getFullYear()} qaTestGE · v{version}
            </span>
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
              : modal === "edit-bug"
                ? "Editar bug"
                : modal === "case"
                  ? "Nuevo caso de prueba"
                  : modal === "edit-case"
                    ? `Editar ${editingCase?.id ?? "caso"}`
                    : modal === "run"
                      ? "Nueva ejecución"
                      : modal === "edit-evidence"
                        ? "Editar evidencia"
                        : modal === "upload-evidence"
                          ? `Archivo de ${editingEvidence?.id ?? "evidencia"}`
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
              {modal !== "evidence" && modal !== "edit-evidence" && modal !== "upload-evidence" && (
                <label className="workspace__field">
                  Título
                  {modal === "bug" || modal === "edit-bug" ? (
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
              {(modal === "bug" || modal === "edit-bug") && (
                <>
                  {modal === "bug" && bugTemplatesError && (
                    <Alert tone="error">{bugTemplatesError}</Alert>
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
                  <TagPicker
                    tags={tags}
                    error={tagError}
                    selectedIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                  />
                  {modal === "edit-bug" && (
                    <>
                      <label className="workspace__field">
                        Estado
                        <select
                          name="status"
                          value={bugForm.status}
                          onChange={(event) =>
                            setBugForm({ ...bugForm, status: event.target.value as BugStatus })
                          }
                        >
                          {bugStatuses.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                      <label className="workspace__field">
                        Responsable
                        <input
                          name="assignee"
                          value={bugForm.assignee}
                          onChange={(event) =>
                            setBugForm({ ...bugForm, assignee: event.target.value })
                          }
                          maxLength={100}
                        />
                      </label>
                    </>
                  )}
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
                  <TagPicker
                    tags={tags}
                    error={tagError}
                    selectedIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                  />
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
                <>
                  <TagPicker
                    tags={tags}
                    error={tagError}
                    selectedIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                  />
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
                </>
              )}
              {modal === "evidence" && (
                <>
                  <p className="workspace__notice">
                    El archivo se almacena de forma privada en PostgreSQL y solo se descarga con
                    acceso al proyecto. Tamaño máximo: 2 MiB.
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
              {modal === "upload-evidence" && (
                <>
                  <p className="workspace__notice">
                    {editingEvidence?.hasFile
                      ? "Subir un archivo reemplazará el contenido actual. La descarga seguirá protegida por sesión y proyecto."
                      : "El archivo se almacenará de forma privada y estará disponible para descarga autenticada."}{" "}
                    Máximo 2 MiB.
                  </p>
                  <label className="workspace__field">
                    Archivo
                    <input name="file" type="file" required />
                  </label>
                </>
              )}
              {modal === "edit-evidence" && (
                <>
                  <p className="workspace__notice">
                    Se editarán los metadatos. Usa las acciones de evidencia para subir o descargar
                    su archivo. Si no cambias el vínculo, se conservarán todas las referencias
                    actuales.
                  </p>
                  <label className="workspace__field">
                    Nombre
                    <input
                      name="name"
                      value={evidenceForm.name}
                      onChange={(event) =>
                        setEvidenceForm({ ...evidenceForm, name: event.target.value })
                      }
                      maxLength={255}
                      required
                    />
                  </label>
                  <label className="workspace__field">
                    Tipo
                    <select
                      name="type"
                      value={evidenceForm.type}
                      onChange={(event) =>
                        setEvidenceForm({
                          ...evidenceForm,
                          type: event.target.value as Evidence["type"],
                        })
                      }
                      disabled={editingEvidence?.hasFile}
                    >
                      <option>Imagen</option>
                      <option>Video</option>
                      <option>Archivo</option>
                    </select>
                  </label>
                  <label className="workspace__field">
                    Tamaño en bytes
                    <input
                      name="sizeBytes"
                      type="number"
                      min={0}
                      step={1}
                      value={evidenceForm.sizeBytes}
                      onChange={(event) =>
                        setEvidenceForm({ ...evidenceForm, sizeBytes: event.target.valueAsNumber })
                      }
                      disabled={editingEvidence?.hasFile}
                      required
                    />
                  </label>
                  <label className="workspace__field">
                    Vincular a
                    <select
                      name="related"
                      value={evidenceForm.related}
                      onChange={(event) => {
                        setEvidenceForm({ ...evidenceForm, related: event.target.value });
                        setEvidenceRelatedChanged(true);
                      }}
                    >
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
            {formError && <Alert tone="error">{formError}</Alert>}
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
                {saving
                  ? "Guardando…"
                  : ["edit-case", "edit-bug", "edit-evidence"].includes(modal)
                    ? "Guardar cambios"
                    : "Guardar"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {runDetail && (
        <TestRunDialog
          key={runDetail.id}
          run={runDetail}
          initialAction={runAction}
          cases={cases}
          onClose={() => setRunDetail(null)}
          onChanged={(updated) => {
            setRunDetail(updated);
            setRevision((current) => current + 1);
          }}
          onDeleted={() => {
            setRunDetail(null);
            setRevision((current) => current + 1);
          }}
        />
      )}
      {recordDetail && (
        <RecordDetailsDialog
          detail={recordDetail}
          onClose={() => setRecordDetail(null)}
          onEdit={() => {
            if (recordDetail.kind === "bug") editBug(recordDetail.record);
            else editCase(recordDetail.record);
          }}
        >
          {recordDetail.kind === "case" && <CaseAttachmentsPanel testCase={recordDetail.record} />}
        </RecordDetailsDialog>
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
      {evidenceActionTarget && (
        <Dialog title={evidenceActionTarget.name} onClose={() => setEvidenceActionTarget(null)}>
          <p className="workspace__notice">Gestiona los metadatos de esta evidencia.</p>
          <div className="workspace__evidence-actions">
            {evidenceActionTarget.hasFile && (
              <button
                type="button"
                className="workspace__secondary"
                onClick={() => void downloadEvidence(evidenceActionTarget)}
              >
                Descargar archivo
              </button>
            )}
            <button
              type="button"
              className="workspace__secondary"
              onClick={() => {
                setEditingEvidence(evidenceActionTarget);
                setEvidenceActionTarget(null);
                setFormError("");
                setModal("upload-evidence");
              }}
            >
              {evidenceActionTarget.hasFile ? "Reemplazar archivo" : "Subir archivo"}
            </button>
            <button
              type="button"
              className="workspace__secondary"
              onClick={() => editEvidence(evidenceActionTarget)}
            >
              Editar metadatos
            </button>
            <button
              type="button"
              className="workspace__danger"
              onClick={() => {
                setEvidenceToDelete(evidenceActionTarget);
                setEvidenceActionTarget(null);
                setFormError("");
              }}
            >
              Eliminar evidencia
            </button>
          </div>
        </Dialog>
      )}
      {evidenceToDelete && (
        <Dialog
          title="Eliminar evidencia"
          onClose={() => {
            if (!saving) {
              setEvidenceToDelete(null);
              setFormError("");
            }
          }}
        >
          <p>
            ¿Quieres eliminar los metadatos de <strong>{evidenceToDelete.name}</strong>? Esta acción
            no se puede deshacer.
          </p>
          {formError && <Alert tone="error">{formError}</Alert>}
          <div className="workspace__actions">
            <button
              type="button"
              className="workspace__secondary"
              disabled={saving}
              onClick={() => {
                setEvidenceToDelete(null);
                setFormError("");
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="workspace__danger"
              disabled={saving}
              onClick={() => void removeEvidence()}
            >
              {saving ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
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
      {deleteBugTarget && (
        <Dialog
          title={`Eliminar ${deleteBugTarget.id}`}
          onClose={() => {
            if (!deleteBugBusy) setDeleteBugTarget(null);
          }}
        >
          <p className="workspace__notice">
            El bug se eliminará. Si tiene casos o evidencias vinculadas, primero debes revisar esas
            relaciones.
          </p>
          {deleteBugError && <Alert tone="error">{deleteBugError}</Alert>}
          <div className="workspace__actions">
            <button
              type="button"
              className="workspace__secondary"
              disabled={deleteBugBusy}
              onClick={() => setDeleteBugTarget(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="workspace__danger"
              disabled={deleteBugBusy}
              onClick={() => void removeBug()}
            >
              {deleteBugBusy ? "Eliminando…" : "Eliminar bug"}
            </button>
          </div>
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
          {deleteCaseError && <Alert tone="error">{deleteCaseError}</Alert>}
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
        <Alert
          className="toast"
          tone={toastTone}
          onDismiss={() => {
            clearTimeout(toastTimer.current);
            setToast("");
          }}
        >
          {toast}
        </Alert>
      )}
    </div>
  );
}

function TagBadges({ ids, tags }: { ids: string[]; tags: Tag[] }) {
  const assigned = tags.filter((tag) => ids.includes(tag.id));
  if (!assigned.length) return null;
  return (
    <span className="tags-view__badges" aria-label="Tags asignados">
      {assigned.map((tag) => (
        <span className="tags-view__badge" key={tag.id}>
          <span className="tags-view__swatch" style={{ backgroundColor: tag.color }} />
          {tag.name}
        </span>
      ))}
    </span>
  );
}

function TagPicker({
  tags,
  error,
  selectedIds,
  onChange,
}: {
  tags: Tag[];
  error: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="workspace__fieldset">
      <legend>Tags</legend>
      {error ? (
        <Alert tone="error">{error}</Alert>
      ) : tags.length ? (
        tags.map((tag) => (
          <label className="workspace__check" key={tag.id}>
            <input
              type="checkbox"
              name="tagIds"
              value={tag.id}
              checked={selectedIds.includes(tag.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selectedIds, tag.id]
                    : selectedIds.filter((id) => id !== tag.id),
                )
              }
            />
            <span className="tags-view__swatch" style={{ backgroundColor: tag.color }} />
            {tag.name}
          </label>
        ))
      ) : (
        <p>No hay tags. Puedes crearlos desde la sección Tags.</p>
      )}
    </fieldset>
  );
}

function pageDescription(page: NavigationPage): string {
  return {
    overview: "Aquí tienes el estado de calidad de tus proyectos.",
    bugs: "Registra, prioriza y da seguimiento a las incidencias de tus proyectos.",
    cases: "Organiza los escenarios que mantienen tu producto bajo control.",
    runs: "Ejecuta suites de prueba y consulta sus resultados.",
    evidence: "Capturas, videos y archivos vinculados a tu actividad de QA.",
    tags: "Crea tags por proyecto y clasifica bugs, casos de prueba y ejecuciones.",
    settings: "Preferencias del workspace y de tu perfil.",
    wiki: "Aprende a utilizar las funciones disponibles de qaTestGE.",
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

function RowActions({
  id,
  onEdit,
  onDelete,
}: {
  id: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <span className="workspace-table__actions" onClick={(event) => event.stopPropagation()}>
      {onEdit && (
        <button
          type="button"
          className="workspace__secondary"
          aria-label={`Editar ${id}`}
          onClick={onEdit}
        >
          Editar
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="workspace__danger"
          aria-label={`Eliminar ${id}`}
          onClick={onDelete}
        >
          Eliminar
        </button>
      )}
    </span>
  );
}

function BugTable({
  bugs,
  tags,
  onSelect,
  onExport,
  onEdit,
  onDelete,
  onStatusChange,
  updatingStatus,
  compact = false,
}: {
  bugs: Bug[];
  tags: Tag[];
  onSelect: (bug: Bug) => void;
  onExport: (bug: Bug) => void;
  onEdit?: (bug: Bug) => void;
  onDelete?: (bug: Bug) => void;
  onStatusChange: (bug: Bug, status: BugStatus) => void;
  updatingStatus: string;
  compact?: boolean;
}) {
  return (
    <div className={`workspace-table__scroll${compact ? " table-compact" : ""}`}>
      <table className="workspace-table__table">
        <thead>
          <tr>
            <th>BUG ID</th>
            <th>TÍTULO</th>
            <th>PRIORIDAD</th>
            <th>ESTADO</th>
            <th>ASIGNADO</th>
            <th>CREADO</th>
            <th>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {bugs.map((bug) => (
            <tr key={bug.id} onClick={() => onSelect(bug)}>
              <td data-label="BUG ID">
                <span className="id-text">{bug.id}</span>
              </td>
              <td data-label="TÍTULO">
                <span className="bug-title">{bug.title}</span>
                <span className="table-project">{bug.project}</span>
                <TagBadges ids={bug.tagIds ?? []} tags={tags} />
              </td>
              <td data-label="PRIORIDAD">
                <Priority level={bug.priority} />
              </td>
              <td data-label="ESTADO">
                {" "}
                <StatusControl
                  label={bug.id}
                  status={bug.status}
                  statuses={bugStatuses}
                  disabled={Boolean(updatingStatus)}
                  onChange={(status) => onStatusChange(bug, status)}
                />
              </td>
              <td data-label="ASIGNADO">
                <span className="assignee">
                  <Avatar initials={bug.assignee} color={bug.color} small />
                  <span>{bug.assignee}</span>
                </span>
              </td>
              <td data-label="CREADO" className="muted-cell">
                {bug.updated}
              </td>
              <td data-label="Acciones">
                <RowActions
                  id={bug.id}
                  onEdit={onEdit ? () => onEdit(bug) : undefined}
                  onDelete={onDelete ? () => onDelete(bug) : undefined}
                />
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
  tags,
  onSelect,
  onExport,
  onEdit,
  onDelete,
  onStatusChange,
  updatingStatus,
}: {
  items: TestCase[];
  tags: Tag[];
  onSelect: (item: TestCase) => void;
  onExport: (item: TestCase) => void;
  onEdit: (item: TestCase) => void;
  onDelete: (item: TestCase) => void;
  onStatusChange: (item: TestCase, status: CaseStatus) => void;
  updatingStatus: string;
}) {
  return (
    <div className="workspace-table__scroll">
      <table className="workspace-table__table">
        <thead>
          <tr>
            <th>CASO ID</th>
            <th>NOMBRE DEL CASO</th>
            <th>SUITE</th>
            <th>ESTADO</th>
            <th>CREADO</th>
            <th>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} onClick={() => onSelect(item)}>
              <td data-label="CASO ID">
                <span className="id-text">{item.id}</span>
              </td>
              <td data-label="NOMBRE DEL CASO">
                <span className="bug-title">{item.title}</span>
                <TagBadges ids={item.tagIds ?? []} tags={tags} />
              </td>
              <td data-label="SUITE">
                <span className="suite-badge">{item.suite || "—"}</span>
              </td>
              <td data-label="ESTADO">
                <StatusControl
                  label={item.id}
                  status={item.status}
                  statuses={caseStatuses}
                  disabled={Boolean(updatingStatus)}
                  onChange={(status) => onStatusChange(item, status)}
                />
              </td>
              <td data-label="CREADO" className="muted-cell">
                {item.updated}
              </td>
              <td data-label="Acciones">
                <RowActions
                  id={item.id}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item)}
                />
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

function RunTable({
  items,
  tags,
  onSelect,
}: {
  items: TestRun[];
  tags: Tag[];
  onSelect: (item: TestRun, action: "view" | "edit" | "delete") => void;
}) {
  return (
    <div className="workspace-table__scroll">
      <table className="workspace-table__table">
        <thead>
          <tr>
            <th>RUN ID</th>
            <th>NOMBRE DE EJECUCIÓN</th>
            <th>CASOS</th>
            <th>PROGRESO</th>
            <th>ESTADO</th>
            <th>RESPONSABLE</th>
            <th>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} onClick={() => onSelect(item, "view")}>
              <td data-label="RUN ID">
                <span className="id-text">{item.id}</span>
              </td>
              <td data-label="NOMBRE DE EJECUCIÓN">
                <button
                  className="workspace-table__open"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(item, "view");
                  }}
                >
                  {item.title}
                </button>
                <TagBadges ids={item.tagIds ?? []} tags={tags} />
              </td>
              <td data-label="CASOS" className="muted-cell">
                {item.cases}
              </td>
              <td data-label="PROGRESO">
                <div className="table-progress">
                  <span>
                    <i style={{ width: `${item.progress}%` }} />
                  </span>
                  {item.progress}%
                </div>
              </td>
              <td data-label="ESTADO">
                <StatusBadge status={item.status} />
              </td>
              <td data-label="RESPONSABLE" className="muted-cell">
                {item.owner}
              </td>
              <td data-label="Acciones">
                <RowActions
                  id={item.id}
                  onEdit={() => onSelect(item, "edit")}
                  onDelete={() => onSelect(item, "delete")}
                />
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
  onActions,
}: {
  items: Evidence[];
  onSelect: (item: Evidence) => void;
  onActions: (item: Evidence) => void;
}) {
  return (
    <div className="workspace-table__scroll">
      <table className="workspace-table__table">
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
              <td data-label="NOMBRE">
                <span className="evidence-name">
                  <span className="evidence-file">
                    <Icon name="file" size={17} />
                  </span>
                  <span>
                    <span className="bug-title">{item.name}</span>
                    <span className="table-project">
                      {item.hasFile ? "Archivo disponible" : "Solo metadatos"}
                    </span>
                  </span>
                </span>
              </td>
              <td data-label="TIPO">
                <span className="suite-badge">{item.type}</span>
              </td>
              <td data-label="VINCULADO A">
                <span className="id-text">{item.related}</span>
              </td>
              <td data-label="TAMAÑO" className="muted-cell">
                {item.size}
              </td>
              <td data-label="FECHA" className="muted-cell">
                {item.date}
              </td>
              <td data-label="Acciones">
                <button
                  type="button"
                  className="row-more"
                  aria-label={`Más opciones para ${item.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onActions(item);
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

export default App;
